// Stub for Vitrine-Ai — image sizing helpers from Open-Generative-AI
export const T2I_DIMENSION_RATIOS = ['1:1','16:9','9:16','4:3','3:4','21:9','9:21']
export const I2I_DIMENSION_RATIOS = ['1:1','16:9','9:16','4:3','3:4']
export function getAspectRatioOptions(model: any, ratios: any) {
  if (model && Array.isArray(model.aspectRatios) && model.aspectRatios.length) return model.aspectRatios
  return ratios || T2I_DIMENSION_RATIOS
}
export default { T2I_DIMENSION_RATIOS, I2I_DIMENSION_RATIOS, getAspectRatioOptions }
