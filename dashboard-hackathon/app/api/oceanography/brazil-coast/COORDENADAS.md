# Coordenadas do Mapa de Calor - Dados Oceanográficos

## Limites Geográficos (Bounds)

O mapa de calor cobre toda a costa brasileira com os seguintes limites:

```typescript
BRAZIL_COAST_BOUNDS = {
  minLat: -34.0,  // Sul: Chuí, Rio Grande do Sul
  maxLat: 5.0,    // Norte: Oiapoque, Amapá
  minLon: -52.0,  // Leste (mais distante da costa)
  maxLon: -34.0,  // Oeste (incluindo baía de Todos os Santos)
}
```

**Extensão total:**
- **Latitude**: De -34.0° (Chuí, RS) até 5.0° (Oiapoque, AP) = **39 graus** (~4.330 km)
- **Longitude**: De -52.0° até -34.0° = **18 graus** (~1.800 km)

## Geração de Pontos

### Grid de Pontos

Os pontos são gerados em um grid denso ao longo da costa:

- **Intervalo de Latitude (`latStep`)**: **0.15 graus** (~16 km entre pontos)
- **Intervalo de Longitude (`lonStep`)**: **0.15 graus** (~16 km entre pontos)

### Cálculo da Longitude da Costa

A longitude da costa é calculada dinamicamente baseada na latitude, seguindo a forma real da costa brasileira:

| Latitude | Região | Longitude da Costa | Exemplo |
|----------|--------|-------------------|---------|
| ≥ 4° | Oiapoque, AP | -51.0° | Extremo norte |
| 0° a 4° | Amapá e Pará | -50.0° + (lat - 0) × 0.3 | Macapá, Belém |
| -5° a 0° | Maranhão e Ceará | -38.0° - (lat + 5) × 0.2 | Fortaleza, São Luís |
| -10° a -5° | Pernambuco, Alagoas, Sergipe | -35.0° - (lat + 10) × 0.15 | Recife, Maceió |
| -15° a -10° | Bahia | -38.0° - (lat + 15) × 0.3 | Salvador |
| -20° a -15° | Espírito Santo | -40.0° - (lat + 20) × 0.2 | Vitória |
| -25° a -20° | Rio de Janeiro e São Paulo | -43.0° - (lat + 25) × 0.15 | Rio de Janeiro, Santos |
| -30° a -25° | Paraná e Santa Catarina | -48.0° - (lat + 30) × 0.1 | Paranaguá, Florianópolis |
| < -30° | Rio Grande do Sul | -50.0° - (lat + 34) × 0.05 | Rio Grande, Chuí |

### Faixa de Pontos

Para cada latitude, os pontos são criados em uma **faixa de 6 graus** ao redor da linha da costa:

- **Oeste da costa**: `coastLon - 3 graus` (~300 km)
- **Leste da costa**: `coastLon + 3 graus` (~300 km)

Isso garante cobertura de aproximadamente **600 km de largura** ao longo de toda a costa.

## Exemplo de Pontos Gerados

Para uma latitude específica (ex: -15°, região de Salvador):

1. **Longitude da costa calculada**: ~-38.0°
2. **Faixa de longitudes**: De -41.0° até -35.0°
3. **Pontos gerados**: A cada 0.15 graus nesta faixa
   - -41.0°, -40.85°, -40.7°, ..., -35.15°, -35.0°

## Quantidade Aproximada de Pontos

- **Latitudes**: (5.0 - (-34.0)) / 0.15 = **~260 linhas**
- **Longitudes por linha**: 6 / 0.15 = **~40 pontos**
- **Total aproximado**: **~10.400 pontos** para cada tipo de dado (temperatura, clorofila)

## Filtros Aplicados

Apenas pontos que atendem **ambas** as condições são incluídos:

1. `lat >= -34.0 && lat <= 5.0` (dentro dos limites de latitude)
2. `lon >= -52.0 && lon <= -34.0` (dentro dos limites de longitude)

## Uso no Heatmap

Cada ponto no heatmap é representado como:
```typescript
[latitude, longitude, intensidade]
```

Onde:
- **Latitude**: Coordenada Y (-34.0 a 5.0)
- **Longitude**: Coordenada X (calculada dinamicamente baseada na latitude)
- **Intensidade**: Valor normalizado (0-1) baseado no tipo de dado:
  - **Temperatura**: (temp - 16) / 14 (normaliza 16-30°C para 0-1)
  - **Clorofila**: chlor / 4 (normaliza 0-4 mg/m³ para 0-1)
  - **Risco**: risk / 100 (normaliza 0-100% para 0-1)

