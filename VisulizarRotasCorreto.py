# -*- coding: utf-8 -*-
"""
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║                    VISUALIZADOR DE ROTAS - MAPA INTERATIVO                  ║
║                                                                              ║
║                      Dados AIS Frota Transpetro                             ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
"""

import os
import sys
import io
import pandas as pd
import folium
from folium import plugins
from pathlib import Path

# Configurar stdout para UTF-8 no Windows
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

BASE_PATH = Path(__file__).parent
AIS_FOLDER = BASE_PATH / "Dados AIS frota TP"


def carregar_dados_ais():
    """Carrega todos os dados AIS"""
    print("\n⏳ Carregando dados AIS...")
    dados = {}
    
    if not AIS_FOLDER.exists():
        print(f"❌ Pasta {AIS_FOLDER} não encontrada!")
        return dados
    
    arquivos_csv = list(AIS_FOLDER.glob("*.csv"))
    print(f"📁 Encontrados {len(arquivos_csv)} arquivos AIS")
    
    # Possíveis nomes de colunas
    lat_names = ['latitude', 'lat', 'lati']
    lon_names = ['longitude', 'lon', 'long', 'lng']
    date_names = ['datetime', 'date_time', 'timestamp', 'time', 'datahora', 'data_hora', 'date', 'hora', 'data']

    for arquivo in arquivos_csv:
        try:
            nome_navio = arquivo.stem
            df = pd.read_csv(arquivo, encoding='utf-8')

            # Normalizar nomes para minúsculas
            df.columns = [c.strip() for c in df.columns]
            cols_lower = {c: c.lower() for c in df.columns}
            df = df.rename(columns=cols_lower)

            # Detectar colunas de latitude/longitude
            lat_col = next((c for c in df.columns if c in lat_names), None)
            lon_col = next((c for c in df.columns if c in lon_names), None)

            if lat_col is None or lon_col is None:
                print(f"⚠ {nome_navio}: Colunas de latitude/longitude não encontradas")
                continue

            # Converter para numérico
            df[lat_col] = pd.to_numeric(df[lat_col], errors='coerce')
            df[lon_col] = pd.to_numeric(df[lon_col], errors='coerce')

            # Detectar e corrigir possível troca lat/lon (valores inválidos)
            lat_median = df[lat_col].abs().median(skipna=True)
            lon_median = df[lon_col].abs().median(skipna=True)
            if lat_median > 90 and lon_median <= 90:
                # provavelmente invertidos
                df['latitude'] = df[lon_col]
                df['longitude'] = df[lat_col]
            else:
                df['latitude'] = df[lat_col]
                df['longitude'] = df[lon_col]

            # Tentar encontrar coluna de data/hora
            dt_col = next((c for c in df.columns if c in date_names), None)
            if dt_col is None:
                # tentar combinar colunas 'date' + 'time'
                if 'date' in df.columns and 'time' in df.columns:
                    try:
                        df['datetime'] = pd.to_datetime(df['date'].astype(str) + ' ' + df['time'].astype(str), errors='coerce')
                    except:
                        df['datetime'] = pd.NaT
                else:
                    df['datetime'] = pd.NaT
            else:
                df['datetime'] = pd.to_datetime(df[dt_col], errors='coerce')

            # Renomear para colunas consistentes e guardar
            df = df.rename(columns={'latitude':'latitude', 'longitude':'longitude'})
            dados[nome_navio] = df
            print(f"✓ {nome_navio}: {len(df)} registros (lat/lon detectados)")

        except Exception as e:
            print(f"❌ Erro ao carregar {arquivo.stem}: {e}")
    
    return dados


# Funções utilitárias no nível do módulo (reutilizáveis)
def haversine_km(a, b):
    import math
    lat1, lon1 = a
    lat2, lon2 = b
    R = 6371.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    hav = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlambda/2)**2
    return 2 * R * math.asin(math.sqrt(hav))


def detectar_paradas(df_pts, max_jump_km=0.1, min_stop_minutes=30, speed_threshold_kmh=2.0):
    """Detecta paradas em um DataFrame com colunas 'latitude','longitude','datetime'.
    Retorna lista de paradas com centroid, start/end time e duração em minutos.
    """
    stops = []
    if len(df_pts) < 2:
        return stops

    lats = df_pts['latitude'].to_numpy()
    lons = df_pts['longitude'].to_numpy()
    times = pd.to_datetime(df_pts['datetime']) if 'datetime' in df_pts.columns else pd.to_datetime(pd.Series([pd.NaT]*len(df_pts)))

    deltas_min = []
    dists_km = []
    speeds_kmh = []
    for i in range(len(lats)-1):
        try:
            a = (float(lats[i]), float(lons[i]))
            b = (float(lats[i+1]), float(lons[i+1]))
        except Exception:
            deltas_min.append(None)
            dists_km.append(0.0)
            speeds_kmh.append(0.0)
            continue
        dist = haversine_km(a, b)
        dists_km.append(dist)
        t1 = times.iloc[i]
        t2 = times.iloc[i+1]
        if pd.isna(t1) or pd.isna(t2):
            dt_min = None
        else:
            dt_min = (t2 - t1).total_seconds() / 60.0
        deltas_min.append(dt_min)
        if dt_min and dt_min > 0:
            speed = (dist / (dt_min/60.0)) if dt_min>0 else 0.0
        else:
            speed = 0.0
        speeds_kmh.append(speed)

    low_flags = []
    for i in range(len(speeds_kmh)):
        dt = deltas_min[i]
        sp = speeds_kmh[i]
        dist = dists_km[i]
        if (dt is not None and dt >= min_stop_minutes and dist <= max_jump_km) or (sp <= speed_threshold_kmh):
            low_flags.append(True)
        else:
            low_flags.append(False)

    i = 0
    n = len(low_flags)
    while i < n:
        if not low_flags[i]:
            i += 1
            continue
        start = i
        while i+1 < n and low_flags[i+1]:
            i += 1
        end = i+1
        idx_start = start
        idx_end = end
        pts_idx = list(range(idx_start, idx_end+1))
        lats_seg = [lats[k] for k in pts_idx if not pd.isna(lats[k])]
        lons_seg = [lons[k] for k in pts_idx if not pd.isna(lons[k])]
        if len(lats_seg) == 0:
            i += 1
            continue
        centroid = (sum(lats_seg)/len(lats_seg), sum(lons_seg)/len(lons_seg))
        start_time = times.iloc[idx_start] if not pd.isna(times.iloc[idx_start]) else None
        end_time = times.iloc[idx_end] if not pd.isna(times.iloc[idx_end]) else None
        duration_min = None
        if start_time is not None and end_time is not None:
            duration_min = (end_time - start_time).total_seconds()/60.0
        stops.append({'start_idx': idx_start, 'end_idx': idx_end, 'start_time': start_time, 'end_time': end_time, 'duration_min': duration_min, 'centroid': centroid})
        i += 1

    return stops


def criar_mapa_rotas(dados_ais):
    """Cria mapa interativo com rotas dos navios"""
    
    if not dados_ais:
        print("❌ Nenhum dado AIS carregado!")
        return
    
    print("\n🗺️  Criando mapa interativo...")
    
    # Cores diferentes para cada navio
    cores = ['red', 'blue', 'green', 'purple', 'orange', 'darkred', 
             'lightred', 'darkblue', 'darkgreen', 'cadetblue', 'darkpurple',
             'white', 'pink', 'lightblue', 'lightgreen', 'gray', 'black',
             'lightgray', 'beige', 'maroon']
    
    # Encontrar limites do mapa
    lat_min, lat_max = 90, -90
    lon_min, lon_max = 180, -180
    
    for navio, df in dados_ais.items():
        if 'latitude' in df.columns and 'longitude' in df.columns:
            lat_min = min(lat_min, df['latitude'].min())
            lat_max = max(lat_max, df['latitude'].max())
            lon_min = min(lon_min, df['longitude'].min())
            lon_max = max(lon_max, df['longitude'].max())
    
    # Centro do mapa
    center_lat = (lat_min + lat_max) / 2
    center_lon = (lon_min + lon_max) / 2
    
    # Criar mapa
    mapa = folium.Map(
        location=[center_lat, center_lon],
        zoom_start=4,
        tiles='OpenStreetMap'
    )

    # Função utilitária: distância haversine em km
    def haversine_km(a, b):
        import math
        lat1, lon1 = a
        lat2, lon2 = b
        R = 6371.0
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        dphi = math.radians(lat2 - lat1)
        dlambda = math.radians(lon2 - lon1)
        hav = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlambda/2)**2
        return 2 * R * math.asin(math.sqrt(hav))

    # Detecta paradas: grupos de pontos com velocidade baixa ou deslocamento muito pequeno
    def detectar_paradas(df_pts, max_jump_km=0.1, min_stop_minutes=30, speed_threshold_kmh=2.0):
        """Recebe DataFrame com colunas 'latitude','longitude','datetime' e retorna lista de paradas.
        Cada parada é dict: {'start_idx', 'end_idx', 'start_time', 'end_time', 'duration_min', 'centroid'}
        """
        stops = []
        if len(df_pts) < 2:
            return stops

        # Calcular distância e tempo entre pontos consecutivos
        lats = df_pts['latitude'].to_numpy()
        lons = df_pts['longitude'].to_numpy()
        times = pd.to_datetime(df_pts['datetime']) if 'datetime' in df_pts.columns else pd.to_datetime(pd.Series([pd.NaT]*len(df_pts)))

        deltas_min = []
        dists_km = []
        speeds_kmh = []
        for i in range(len(lats)-1):
            a = (float(lats[i]), float(lons[i]))
            b = (float(lats[i+1]), float(lons[i+1]))
            dist = haversine_km(a, b)
            dists_km.append(dist)
            # tempo
            t1 = times.iloc[i]
            t2 = times.iloc[i+1]
            if pd.isna(t1) or pd.isna(t2):
                dt_min = None
            else:
                dt_min = (t2 - t1).total_seconds() / 60.0
            deltas_min.append(dt_min)
            if dt_min and dt_min > 0:
                speed = (dist / (dt_min/60.0)) if dt_min>0 else 0.0
            else:
                speed = 0.0
            speeds_kmh.append(speed)

        # Classificar como 'baixo movimento' quando speed < threshold ou dist < max_jump_km with some time
        low_flags = []
        for i in range(len(speeds_kmh)):
            dt = deltas_min[i]
            sp = speeds_kmh[i]
            dist = dists_km[i]
            if (dt is not None and dt >= min_stop_minutes and dist <= max_jump_km) or (sp <= speed_threshold_kmh):
                low_flags.append(True)
            else:
                low_flags.append(False)

        # Agrupar flags consecutivos em paradas
        i = 0
        n = len(low_flags)
        while i < n:
            if not low_flags[i]:
                i += 1
                continue
            start = i
            while i+1 < n and low_flags[i+1]:
                i += 1
            end = i+1  # end index in terms of points: covers points start..end
            # compute centroid of points from start to end+1
            idx_start = start
            idx_end = end  # inclusive end point index = end
            pts_idx = list(range(idx_start, idx_end+1))
            lats_seg = [lats[k] for k in pts_idx if not pd.isna(lats[k])]
            lons_seg = [lons[k] for k in pts_idx if not pd.isna(lons[k])]
            if len(lats_seg) == 0:
                i += 1
                continue
            centroid = (sum(lats_seg)/len(lats_seg), sum(lons_seg)/len(lons_seg))
            start_time = times.iloc[idx_start] if not pd.isna(times.iloc[idx_start]) else None
            end_time = times.iloc[idx_end] if not pd.isna(times.iloc[idx_end]) else None
            duration_min = None
            if start_time is not None and end_time is not None:
                duration_min = (end_time - start_time).total_seconds()/60.0
            stops.append({'start_idx': idx_start, 'end_idx': idx_end, 'start_time': start_time, 'end_time': end_time, 'duration_min': duration_min, 'centroid': centroid})
            i += 1

        return stops
    
    # FeatureGroup global para paradas (toggle no LayerControl)
    paradas_fg = folium.FeatureGroup(name='Paradas', show=False)

    # Adicionar rotas de cada navio (cada navio em seu FeatureGroup para filtro)
    feature_groups = {}
    for idx, (navio, df) in enumerate(dados_ais.items()):
        
        if 'latitude' not in df.columns or 'longitude' not in df.columns:
            continue
        
        # Ordenar por data/hora se existir
        if 'datetime' in df.columns:
            try:
                df = df.sort_values('datetime')
            except:
                pass
        
        # Pegar apenas coordenadas válidas
        df_valido = df.dropna(subset=['latitude', 'longitude'])
        
        if len(df_valido) == 0:
            continue
        
        # Cor para este navio
        cor = cores[idx % len(cores)]
        
        # Garantir tipos float e ordenar por datetime quando possível
        df_valido['latitude'] = pd.to_numeric(df_valido['latitude'], errors='coerce')
        df_valido['longitude'] = pd.to_numeric(df_valido['longitude'], errors='coerce')
        if 'datetime' in df_valido.columns and not df_valido['datetime'].isna().all():
            df_valido = df_valido.sort_values('datetime')

        # Criar lista de pontos para a linha
        pontos = list(zip(df_valido['latitude'].astype(float), df_valido['longitude'].astype(float)))
        
        # Criar FeatureGroup para este navio (permite ligar/desligar)
        fg = folium.FeatureGroup(name=str(navio))
        # Dividir em segmentos quando houver saltos longos (evita linhas cruzando o mapa)
        max_jump_km = 100.0
        segment = [pontos[0]]
        segments = []
        for a, b in zip(pontos[:-1], pontos[1:]):
            dist = haversine_km(a, b)
            if dist <= max_jump_km:
                segment.append(b)
            else:
                # terminar segmento atual e iniciar novo
                if len(segment) >= 2:
                    segments.append(segment)
                segment = [b]
        if len(segment) >= 2:
            segments.append(segment)

        # Adicionar cada segmento como PolyLine
        for seg in segments:
            folium.PolyLine(
                seg,
                color=cor,
                weight=2,
                opacity=0.8,
                popup=f"Rota: {navio}",
                tooltip=f"{navio}"
            ).add_to(fg)

        # Adicionar marcadores de início e fim e paradas
        if len(pontos) > 0:
            # início
            folium.Marker(
                location=pontos[0],
                icon=folium.Icon(color='green', icon='play'),
                popup=f"{navio} - INÍCIO\n{df_valido['datetime'].iloc[0] if 'datetime' in df_valido.columns else ''}"
            ).add_to(fg)

            # fim
            folium.Marker(
                location=pontos[-1],
                icon=folium.Icon(color='red', icon='stop'),
                popup=f"{navio} - FIM\n{df_valido['datetime'].iloc[-1] if 'datetime' in df_valido.columns else ''}"
            ).add_to(fg)

            # pontos intermediários para densidade (menores)
            if len(pontos) > 10:
                passo = len(pontos) // 10
                for j in range(passo, len(pontos), passo):
                    folium.CircleMarker(
                        location=pontos[j],
                        radius=3,
                        color=cor,
                        fill=True,
                        fillColor=cor,
                        fillOpacity=0.5,
                        popup=f"{navio} - {j}"
                    ).add_to(fg)

            # detectar paradas e adicionar ao FeatureGroup global de paradas
            try:
                stops = detectar_paradas(df_valido)
            except Exception:
                stops = []
            for s in stops:
                cent = s['centroid']
                dur = s['duration_min']
                start_t = s['start_time']
                end_t = s['end_time']
                dur_str = f"{dur:.1f}" if (dur is not None) else "N/A"
                popup = f"Parada: {navio}\nInício: {start_t}\nFim: {end_t}\nDuração (min): {dur_str}"
                folium.CircleMarker(
                    location=cent,
                    radius=6,
                    color='blue',
                    fill=True,
                    fillColor='blue',
                    fillOpacity=0.8,
                    popup=popup
                ).add_to(paradas_fg)

        # Adicionar FeatureGroup do navio ao mapa e guardar referência
        fg.add_to(mapa)
        feature_groups[navio] = fg

    # Adicionar FeatureGroup das paradas (após processar todos os navios)
    paradas_fg.add_to(mapa)
    
    # Adicionar controle de camadas (permite filtrar por navio)
    folium.LayerControl(collapsed=False).add_to(mapa)

    # Adicionar legenda simples (Parada disponível como camada toggle no LayerControl)
    parada_line = '&nbsp;<i style="background:blue; width:10px; height:10px; display:inline-block;"></i>&nbsp;Parada (blue)<br>'
    legend_html = f'''
     <div style="position: fixed; bottom: 50px; left: 10px; width: 180px; height: 120px; 
                 background-color: white; border:2px solid grey; z-index:9999; font-size:12px;">
     &nbsp;<b>Legenda</b><br>
     &nbsp;<i class="fa fa-play" style="color:green"></i>&nbsp;Início (green)<br>
     &nbsp;<i class="fa fa-stop" style="color:red"></i>&nbsp;Fim (red)<br>
     {parada_line}
     &nbsp;<i style="background:#000; width:10px; height:4px; display:inline-block;"></i>&nbsp;Rota<br>
     </div>
     '''
    mapa.get_root().html.add_child(folium.Element(legend_html))

    # Salvar mapa
    # Injetar botão toggle para camadas 'Paradas' (cliente JS)
    toggle_paradas_html = '''
<div style="position: fixed; bottom: 10px; right: 10px; z-index:9999;">
    <button id="toggle-paradas-btn" style="background:#fff;border:1px solid #444;padding:6px;border-radius:4px;">Mostrar/Esconder Paradas</button>
</div>
<script>
(function(){
    function findMapInstance(){
        for(var k in window){
            if(k.startsWith('map_') && window[k] && window[k]._layers){
                return window[k];
            }
        }
        return null;
    }
    function toggleParadas(){
        var map = findMapInstance();
        if(!map){ alert('Mapa não encontrado ainda. Recarregue a página.'); return; }
        var found=false;
        for(var lid in map._layers){
            try{
                var layer = map._layers[lid];
                if(layer && layer.options && typeof layer.options.name === 'string' && layer.options.name.indexOf('Paradas')===0){
                    if(map.hasLayer(layer)) map.removeLayer(layer); else map.addLayer(layer);
                    found = true;
                }
            }catch(e){ /* ignorar */ }
        }
        if(!found) console.log('Nenhuma camada Paradas encontrada.');
    }
    document.addEventListener('DOMContentLoaded', function(){
        var btn = document.getElementById('toggle-paradas-btn');
        if(btn) btn.addEventListener('click', toggleParadas);
    });
})();
</script>
'''

    mapa.get_root().html.add_child(folium.Element(toggle_paradas_html))

    arquivo_saida = BASE_PATH / "mapa_rotas.html"
    mapa.save(str(arquivo_saida))
    
    print(f"✅ Mapa criado com sucesso!")
    print(f"📍 Salvo em: {arquivo_saida}")
    print(f"🌐 Abra em seu navegador para visualizar")
    
    return arquivo_saida


def listar_navios(dados_ais):
    """Lista todos os navios e suas estatísticas"""
    print("\n📊 ESTATÍSTICAS DOS NAVIOS")
    print("=" * 80)
    
    for navio, df in dados_ais.items():
        if 'latitude' not in df.columns or 'longitude' not in df.columns:
            continue
        
        registros = len(df)
        registros_validos = len(df.dropna(subset=['latitude', 'longitude']))
        
        lat_min = df['latitude'].min()
        lat_max = df['latitude'].max()
        lon_min = df['longitude'].min()
        lon_max = df['longitude'].max()
        
        print(f"\n🚢 {navio}")
        print(f"   Registros: {registros} ({registros_validos} válidos)")
        print(f"   Latitude:  {lat_min:.2f}° a {lat_max:.2f}°")
        print(f"   Longitude: {lon_min:.2f}° a {lon_max:.2f}°")


def abrir_mapa(arquivo_mapa):
    """Abre o mapa no navegador padrão"""
    try:
        if sys.platform == 'win32':
            os.startfile(arquivo_mapa)
        elif sys.platform == 'darwin':  # macOS
            os.system(f'open "{arquivo_mapa}"')
        else:  # Linux
            os.system(f'xdg-open "{arquivo_mapa}"')
        print("🌐 Abrindo mapa no navegador...")
    except Exception as e:
        print(f"⚠️  Não foi possível abrir o navegador: {e}")


def criar_mapas_por_navio(dados_ais, detect_stops=False):
    """Gera uma página HTML por navio com time slider (TimestampedGeoJson).
    Útil para filtrar por período sem sobrecarregar um único mapa com todos os pontos.
    """
    print("\n⏳ Gerando páginas individuais por navio (TimestampedGeoJson)...")
    out_files = []
    for navio, df in dados_ais.items():
        try:
            df_valido = df.dropna(subset=['latitude', 'longitude']).copy()
            if len(df_valido) == 0:
                continue

            # ordenar por datetime
            if 'datetime' in df_valido.columns:
                df_valido['datetime'] = pd.to_datetime(df_valido['datetime'], errors='coerce')
                df_valido = df_valido.sort_values('datetime')
            else:
                df_valido['datetime'] = pd.NaT

            # Construir FeatureCollection leve: apenas pontos com tempo
            features = []
            for _, row in df_valido.iterrows():
                if pd.isna(row['datetime']):
                    continue
                features.append({
                    'type': 'Feature',
                    'geometry': {
                        'type': 'Point',
                        'coordinates': [float(row['longitude']), float(row['latitude'])]
                    },
                    'properties': {
                        'time': row['datetime'].isoformat(),
                        'popup': f"{navio}<br/>{row['datetime']}",
                        'icon': 'circle',
                    }
                })

            if len(features) == 0:
                # fallback: criar mapa simples sem time
                mapa = folium.Map(location=[df_valido['latitude'].mean(), df_valido['longitude'].mean()], zoom_start=6)
                folium.PolyLine(list(zip(df_valido['latitude'], df_valido['longitude'])), color='blue').add_to(mapa)
            else:
                mapa = folium.Map(location=[df_valido['latitude'].mean(), df_valido['longitude'].mean()], zoom_start=6)
                geojson = {
                    'type': 'FeatureCollection',
                    'features': features
                }
                plugins.TimestampedGeoJson(
                    geojson,
                    period='PT1H',
                    add_last_point=True,
                    transition_time=200,
                    loop=False,
                    auto_play=False,
                    time_slider_drag_update=True
                ).add_to(mapa)

            # Legenda e resumo
            legend_html = '''
             <div style="position: fixed; bottom: 50px; left: 10px; width: 220px; height: 90px; 
                         background-color: white; border:2px solid grey; z-index:9999; font-size:12px;">
             &nbsp;<b>Legenda</b><br>
             &nbsp;<i class="fa fa-play" style="color:green"></i>&nbsp;Início<br>
             &nbsp;<i class="fa fa-stop" style="color:red"></i>&nbsp;Fim<br>
             &nbsp;<i style="background:blue; width:10px; height:10px; display:inline-block;"></i>&nbsp;Parada<br>
             </div>
             '''
            mapa.get_root().html.add_child(folium.Element(legend_html))

            # Adicionar camada de paradas (toggle) e resumo de paradas
            stops = detectar_paradas(df_valido)
            total_stops = len(stops)
            total_stop_minutes = sum([s['duration_min'] or 0 for s in stops])
            stops_info = f"Paradas: {total_stops}<br/>Tempo parado (h): {total_stop_minutes/60:.2f}"

            summary = f"Navio: {navio}<br/>Registros (com tempo): {len(features)}<br/>{stops_info}"
            folium.Marker(
                location=[df_valido['latitude'].mean(), df_valido['longitude'].mean()],
                icon=folium.DivIcon(html=f"<div style='font-family: Arial; font-size:12px; background: white; padding:6px; border:1px solid #999'>{summary}</div>"),
            ).add_to(mapa)

            # Adicionar paradas em camada toggle
            paradas_fg = folium.FeatureGroup(name=f'Paradas - {navio}', show=False)
            for s in stops:
                cent = s['centroid']
                dur = s['duration_min']
                start_t = s['start_time']
                end_t = s['end_time']
                dur_str = f"{dur:.1f}" if (dur is not None) else "N/A"
                popup = f"Parada: {navio}<br/>Início: {start_t}<br/>Fim: {end_t}<br/>Duração (min): {dur_str}"
                folium.CircleMarker(
                    location=cent,
                    radius=6,
                    color='blue',
                    fill=True,
                    fillColor='blue',
                    fillOpacity=0.8,
                    popup=popup
                ).add_to(paradas_fg)

            paradas_fg.add_to(mapa)

            # Adicionar controle de camadas na página por-navio
            folium.LayerControl(collapsed=False).add_to(mapa)

            out_path = BASE_PATH / f"mapa_{navio.replace(' ', '_')}.html"
            mapa.save(str(out_path))
            out_files.append(out_path)
            print(f"✓ {navio}: {out_path.name} ({len(features)} pontos com tempo)")
        except Exception as e:
            print(f"❌ Erro ao gerar mapa para {navio}: {e}")

    print("\n✅ Páginas por navio geradas com sucesso!")
    return out_files


def menu_principal():
    """Menu principal"""
    while True:
        os.system('cls' if os.name == 'nt' else 'clear')
        
        print("""
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║                    VISUALIZADOR DE ROTAS - DADOS AIS                        ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

O que deseja fazer?

  1️⃣  Gerar mapa com rotas de todos os navios
      Cria visualização interativa em HTML

  2️⃣  Listar estatísticas dos navios
      Mostra quantidade de registros e áreas cobertas

  0️⃣  Sair

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        """)
        
        opcao = input("🔹 Escolha uma opção (0-2): ").strip()
        
        if opcao == "1":
            dados_ais = carregar_dados_ais()
            if dados_ais:
                arquivo_mapa = criar_mapa_rotas(dados_ais)
                print("\n" + "=" * 80)
                abrir = input("\n🌐 Deseja abrir o mapa no navegador? (s/n): ").strip().lower()
                if abrir == 's':
                    abrir_mapa(arquivo_mapa)
            input("\n📌 Pressione ENTER para continuar...")
            
        elif opcao == "2":
            dados_ais = carregar_dados_ais()
            if dados_ais:
                listar_navios(dados_ais)
            input("\n📌 Pressione ENTER para continuar...")
            
        elif opcao == "0":
            print("\n👋 Até mais!\n")
            break
        else:
            print("❌ Opção inválida!")
            input("Pressione ENTER para tentar novamente...")


def instalar_dependencias():
    """Tenta instalar folium se não estiver instalado"""
    try:
        import folium
    except ImportError:
        print("⏳ Instalando folium...")
        os.system(f"{sys.executable} -m pip install folium")


if __name__ == "__main__":
    instalar_dependencias()
    menu_principal()
