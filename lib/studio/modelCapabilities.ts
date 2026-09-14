// Stub for Vitrine-Ai fusion — original Open-Generative-AI modelCapabilities ported
// Provides getMediaCapability fallback when catalog not yet fully wired
export function getMediaCapability(model: any, mediaType: any) {
  // model may have capabilities field; fallback generic
  if (model && model.capabilities && model.capabilities[mediaType]) {
    return model.capabilities[mediaType]
  }
  // default: single image, generic constraints
  return { maxItems: 1, maxSizeMB: 10, allowedTypes: ['image/jpeg','image/png','image/webp'] }
}
export default { getMediaCapability }
