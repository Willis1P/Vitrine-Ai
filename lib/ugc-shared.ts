export type LookId = 'brazilian' | 'brazilian-morena' | 'american' | 'european'

export interface LookPreset {
  label: string
  hint: string
  descEn: string
}

export const LOOKS: Record<LookId, LookPreset> = {
  brazilian: {
    label: 'Brasileira',
    hint: 'Morena, cabelo castanho cacheado',
    descEn:
      'a beautiful 24-year-old Brazilian woman with Western facial features, light-olive skin, warm hazel-brown eyes, long wavy chestnut-brown hair, natural no-makeup look, visible skin pores, subtle freckles on the nose',
  },
  'brazilian-morena': {
    label: 'Brasileira Morena',
    hint: 'Pele dourada, cabelo escuro',
    descEn:
      'a stunning 26-year-old Brazilian woman with warm tan-brown skin, deep brown eyes, long wavy dark-brown hair, soft natural makeup, glowing healthy skin with visible pores and natural texture',
  },
  american: {
    label: 'Americana',
    hint: 'Loira, olhos claros',
    descEn:
      'a beautiful 25-year-old American woman with Western European features, wavy blonde hair, blue eyes, fair skin with light freckles, fresh natural no-makeup look, visible skin pores',
  },
  european: {
    label: 'Europeia',
    hint: 'Loiro escuro, elegante',
    descEn:
      'an elegant 27-year-old European woman with refined Western features, dark-blonde hair, green-hazel eyes, fair-olive skin, natural no-makeup beauty, visible skin pores and realistic skin texture',
  },
}

const REALISM_TAIL =
  'candid authentic UGC style: genuine genuine-smiling expression about to speak to the camera, one hand holding a smartphone for a selfie-style take, handheld phone-camera framing, imperfect amateur framing, natural skin texture with pores, no airbrushing, shot on iPhone front camera, soft natural light, slight film grain, 35mm look, f/1.8'

export function buildDefaultPrompt(productName: string, sellingPoints: string[], look: LookId = 'brazilian'): string {
  const desc = LOOKS[look]?.descEn || LOOKS.brazilian.descEn
  return `${desc}. She holds ${productName} in her hands and shows the product to the camera with genuine authentic excitement. ${REALISM_TAIL}. Selling points: ${sellingPoints.join('; ') || 'high quality and great price'}.`
}

export const NEGATIVE_PROMPT =
  'east asian, asian features, korean, japanese, chinese, k-pop, anime, manga, doll-like face, porcelain skin, plastic skin, airbrushed, smooth skin, beauty filter, heavy makeup, 3d render, CGI, illustration, disney, flawless skin, waxy, cartoon, anime style'

export const PT_BR_VOICES = [
  { id: 'pt-BR-FranciscaNeural', label: 'Francisca (Feminino)' },
  { id: 'pt-BR-ThalitaNeural', label: 'Thalita (Feminino)' },
  { id: 'pt-BR-GiovannaNeural', label: 'Giovanna (Feminino)' },
  { id: 'pt-BR-ElzaNeural', label: 'Elza (Feminino)' },
  { id: 'pt-BR-BrendaNeural', label: 'Brenda (Feminino)' },
  { id: 'pt-BR-LeilaNeural', label: 'Leila (Feminino)' },
  { id: 'pt-BR-YaraNeural', label: 'Yara (Feminino)' },
  { id: 'pt-BR-AntonioNeural', label: 'Antonio (Masculino)' },
  { id: 'pt-BR-DonatoNeural', label: 'Donato (Masculino)' },
  { id: 'pt-BR-FabioNeural', label: 'Fabio (Masculino)' },
]