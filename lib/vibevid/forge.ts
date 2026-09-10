// PromptForge FREE - 4 camadas adaptado do vibevid/src/engine/forge.py
// Sem Vertex AI: gera prompt para Pollinations flux (foto) + futura geração de vídeo free via FFmpeg
import { VibevidConfig } from './config'

export interface Persona {
  name: string
  visual_dna: string
  video_visual_dna?: string
}

export interface ForgeResult {
  prompt: string
  negative_prompt: string
  persona_name: string
  persona_dna: string
  scenario: string
  category: string
  lighting: string
}

// Banco simplificado (extraído de vibevid/data/prompts.json + adaptation Vitrine)
const PROMPT_BANK: Record<string, { personas: Persona[]; lighting: string; negative: string; grounding: string; scenarios: string[] }> = {
  FASHION: {
    personas: [
      { name: 'Influencer Carioca', visual_dna: 'confident Brazilian woman, fit figure, long black curly hair with blonde highlights, green eyes' },
      { name: 'Fashion Blogger', visual_dna: 'elegant young woman, straight dark hair, natural makeup, slim fit, minimal gold jewelry' },
    ],
    lighting: 'warm golden hour light, soft diffused window light, luxury boutique ambiance',
    negative: 'floating garment, mannequin, dark scene, harsh shadows, product distortion',
    grounding: 'natural pose, garment worn or draped naturally, fabric following gravity',
    scenarios: [
      '[PERSONA] wearing or holding [1] in a luxury boutique, full-length mirror visible, warm ambient light',
      'Flat-lay of [1] on a king-size bed with white linen, soft overhead natural light, minimalist aesthetic',
      '[PERSONA] doing outfit reveal with [1], bedroom with closet visible',
    ],
  },
  TOOLS: {
    personas: [
      { name: 'Handyman Creator', visual_dna: 'adult hands, short clean nails, slight calluses, dark work glove on one hand' },
      { name: 'DIY Builder', visual_dna: 'adult hands, bare, rough skin, natural tan, casual grey t-shirt at wrist' },
    ],
    lighting: 'natural workshop lighting, warm overhead work lamp, realistic shadows on workbench',
    negative: 'floating product, deformed hands, extra fingers, mutated grip, face visible, sparks',
    grounding: 'product held naturally in hands at correct scale, contact with workbench visible',
    scenarios: [
      'POV shot: real hands gripping [1] firmly, pressing against a wooden plank surface, workshop background',
      'POV shot: hands picking up [1] from a cluttered workbench, inspecting with slight tilt, tools on pegboard',
    ],
  },
  PAINT_RENOVATION: {
    personas: [
      { name: 'Pedreiro Influencer', visual_dna: 'young Brazilian man, athletic build, white t-shirt with paint stains, black tactile gloves' },
      { name: 'DIY Creator', visual_dna: 'young adult Brazilian man, casual overalls with paint spots, friendly smile' },
    ],
    lighting: 'warm studio lighting, soft key light at 45 degrees, natural shadows, contact shadow on surface',
    negative: 'floating product, dark scene, distorted label, melted can, product deformation',
    grounding: 'product resting firmly on surface, visible contact shadow at base, correct proportional scale',
    scenarios: [
      '[PERSONA] standing next to a wooden table where [1] is placed prominently, arms crossed, front label visible at 45 degrees',
      '[PERSONA] standing behind [1] on a wooden stool, arms crossed, smiling at camera, front label facing camera',
    ],
  },
  SMALL_APPAREL: {
    personas: [
      { name: 'Mãe Criativa', visual_dna: "adult woman's hands, light natural skin, manicured nails soft pink, casual cotton top at wrist, no face visible" },
    ],
    lighting: 'soft natural daylight from window, bright and airy, warm indoor ambient',
    negative: 'face visible, full body visible, mannequin hands, dark scene, staged ad look',
    grounding: 'product held naturally in hands or resting on surface at correct scale, light home background',
    scenarios: [
      "POV shot: [PERSONA]'s hands holding [1] showing opening to camera, demonstrating ease of use. Textile top facing camera.",
      "POV shot: [PERSONA]'s hands arranging [1] on light wooden surface, textile tops facing up",
    ],
  },
  PREMIUM_DETAILING: {
    personas: [
      { name: 'Master Detailer', visual_dna: 'confident adult Brazilian man bald, clean-shaven, athletic, black polo and detailing gloves' },
    ],
    lighting: 'extremely well-lit studio with soft diffused white lighting, no harsh shadows',
    negative: 'text, signage, neon, logos, watermarks, floating product, unnatural scale',
    grounding: 'product placed on premium black surface, contact shadow visible',
    scenarios: [
      'Professional product photography of [1] on premium black display surface in luxury auto detailing studio, [PERSONA] standing behind gesturing. Sharp focus on [1], shallow depth of field',
    ],
  },
  OUTERWEAR: {
    personas: [
      { name: 'Trabalhador Outdoor', visual_dna: 'adult Brazilian man lean athletic build, short dark hair, practical confident expression, natural tan - one hand on hip' },
      { name: 'Mulher Ativa', visual_dna: 'confident adult Brazilian woman fit toned, dark hair, warm smile, natural tan' },
    ],
    lighting: 'natural overcast daylight, soft diffused outdoor light, authentic outdoor atmosphere',
    negative: 'mannequin, floating garment, dark studio, rigid stiff fabric, plastic-looking material',
    grounding: 'garment worn naturally, thin fabric draping with gravity, lightweight folds visible',
    scenarios: [
      '[PERSONA] wearing [1] outdoors on a cloudy day, standing confidently on wet urban sidewalk, authentic street environment',
      '[PERSONA] wearing [1] indoors inside a motorcycle parts store, helmets on wall shelves, warm fluorescent light, dry',
    ],
  },
}

const GLOBAL_QUALITY = 'ultra-photorealistic, 8K, sharp focus on product, professional commercial photography, vibrant natural colors'
const GLOBAL_NEGATIVE = 'watermark, text overlay, low resolution, blurry, extra limbs, deformed hands, deformed product'
const GLOBAL_GROUNDING = 'product and person in same focal plane, consistent shadow direction for both subject and product'

function normalizeCategory(cat: string): string {
  const normalized = (cat || 'general').toLowerCase().replace(/-/g, '_')
  const mapped = (VibevidConfig.CATEGORY_MAP as any)[normalized] || (VibevidConfig.CATEGORY_MAP as any)[cat]
  if (mapped) return mapped
  // fallback: tenta partial match
  for (const [vitrineKey, vibevidCat] of Object.entries(VibevidConfig.CATEGORY_MAP)) {
    if (normalized.includes(vitrineKey.replace(/_/g, '')) || vitrineKey.includes(normalized)) return vibevidCat
  }
  return 'FASHION'
}

export class PromptForgeFree {
  selectPersona(category: string): Persona {
    const cat = normalizeCategory(category)
    const data = PROMPT_BANK[cat] || PROMPT_BANK.FASHION
    const pool = data.personas
    return pool[Math.floor(Math.random() * pool.length)]
  }

  buildProductionPrompt(category: string, personaOverride?: Persona, productData?: { name: string; description?: string; scale_reference?: string }): ForgeResult {
    const cat = normalizeCategory(category)
    const data = PROMPT_BANK[cat] || PROMPT_BANK.FASHION
    const persona = personaOverride || this.selectPersona(category)
    const scenarioRaw = data.scenarios[Math.floor(Math.random() * data.scenarios.length)]
    let injected = scenarioRaw
    if (injected.includes('[PERSONA]')) {
      injected = injected.replace('[PERSONA]', persona.visual_dna)
    }

    // Product anchor FIEL (vibevid _build_product_anchor) - força fidelidade
    const productAnchor = productData
      ? `PRODUCT: Render [1] EXACTLY as shown in reference - ${productData.description || productData.name}. Preserve EVERY color, material, pattern, logo and design detail without alteration. Do not substitute.`
      : ''

    const sceneBlock = [injected, data.lighting, data.grounding, GLOBAL_GROUNDING].filter(Boolean).join('. ')
    const parts = [productAnchor, sceneBlock, GLOBAL_QUALITY].filter(Boolean)
    let prompt = parts.join('\n\n').replace(/\.\./g, '.')

    // Substitui [1] por descrição enriquecida do produto (Pollinations não tem binding [1] como Vertex AI)
    if (productData) {
      const prodDesc = `${productData.name}${productData.description ? `, ${productData.description}` : ''}`
      prompt = prompt.replace(/\[1\]/g, prodDesc)
    }
    // Reforça fidelidade no final (peso maior em modelos FLUX)
    if (productData) {
      prompt += ` Product fidelity: EXACT same colors, fabric, print and details as described.`
    }

    const negative = [data.negative, GLOBAL_NEGATIVE].filter(Boolean).join(', ')

    return {
      prompt,
      negative_prompt: negative,
      persona_name: persona.name,
      persona_dna: persona.visual_dna,
      scenario: scenarioRaw,
      category: cat,
      lighting: data.lighting,
    }
  }

  buildStyledPrompt(styleId: string, category: string, productData?: { name: string; description?: string }): ForgeResult {
    // Estilos Vitrine: professional, white-bg, lifestyle, banner, etc -> mapeia para vibevid styles
    // Simplificado: usa buildProductionPrompt com variação de estilo no prefixo
    const stylePrefix: Record<string, string> = {
      'professional': 'professional studio product photography, softbox lighting',
      'white-bg': 'product on clean pure white background, perfect for marketplaces',
      'lifestyle': 'lifestyle photography showing product being used in everyday life, natural light',
      'banner': 'promotional banner style with bold offer highlights',
      'ugc': 'candid UGC iPhone photo, vertical 9:16, real ambient lighting, unposed casual moment',
      'pov': 'First-person POV, real human hands visible at bottom of frame naturally interacting with product',
      'worn': 'FULL BODY shot wearing product completely, dry indoors, standing confidently',
    }
    const base = this.buildProductionPrompt(category, undefined, productData)
    const prefix = stylePrefix[styleId] || stylePrefix['professional']
    return {
      ...base,
      prompt: `${prefix}. ${base.prompt}`,
    }
  }
}
