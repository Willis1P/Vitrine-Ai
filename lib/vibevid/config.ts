// Vibevid-inspired config adaptado para modo FREE (sem Vertex AI / Veo 3)
// Usa Pollinations (imagem flux) + FFmpeg para vídeo slideshow free
export const VibevidConfig = {
  // Video padrão vibevid: 1080x1920 9:16 vertical, 24fps -> Vitrine usa 576x1024 free mas mantém proporção
  VIDEO_WIDTH: 576,
  VIDEO_HEIGHT: 1024,
  VIDEO_FPS: 24,
  DURATION_PER_TAKE: 8, // seg por take (Hook/Value/CTA)
  // Scoring
  SCORE_THRESHOLD: 7,
  // AIDA word count
  MIN_WORDS: 18,
  MAX_WORDS: 26,
  // Rate limit Pollinations
  IMAGE_DELAY_MS: 1500,
  USD_BRL_RATE: 5.8,
  // Mapeamento categorias Vitrine -> Vibevid
  CATEGORY_MAP: {
    'moda-feminina': 'FASHION',
    'moda-masculina': 'FASHION',
    'eletronicos': 'TOOLS',
    'casa-decoracao': 'PAINT_RENOVATION',
    'beleza': 'FASHION',
    'pet': 'SMALL_APPAREL',
    'infantil': 'SMALL_APPAREL', // vibevid: CHILDREN -> Mother POV (sem criança visível)
    'fitness': 'FASHION',
    'acessorios': 'SMALL_APPAREL',
    'alimentos': 'PAINT_RENOVATION',
    'general': 'FASHION',
  } as Record<string, string>,
} as const

export type VitrineCategory = keyof typeof VibevidConfig.CATEGORY_MAP
