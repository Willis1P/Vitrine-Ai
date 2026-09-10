-- ============================================
-- SEED DATA: CATALOG (Templates, Trending, Course Images, Lessons)
-- Idempotent: uses WHERE NOT EXISTS / subselects
-- ============================================

-- -------------------------------------------
-- TEMPLATES
-- -------------------------------------------
INSERT INTO templates (category_id, name, description, type, thumbnail_url, prompt_template, settings, is_premium, is_active, usage_count, sort_order)
SELECT
  (SELECT id FROM template_categories WHERE slug = 'moda-feminina'),
  'Foto de Produto Studio',
  'Fotos profissionais de produto com fundo branco e iluminacao de estudio.',
  'image',
  'https://mlqawjbdufvcxtijfhip.supabase.co/storage/v1/object/public/vittrine-images/templates/template-foto-studio.png',
  'Fotografia profissional de produto, fundo branco, iluminacao de estudio, estilo minimalista',
  '{"aspect_ratio":"1:1","quality":"high","background":"white"}',
  false, true, 3240, 1
WHERE NOT EXISTS (SELECT 1 FROM templates WHERE name = 'Foto de Produto Studio');

INSERT INTO templates (category_id, name, description, type, thumbnail_url, prompt_template, settings, is_premium, is_active, usage_count, sort_order)
SELECT
  (SELECT id FROM template_categories WHERE slug = 'moda-masculina'),
  'Video Promo 15s',
  'Video promocional de 15 segundos para Reels, TikTok e Shorts.',
  'video',
  'https://mlqawjbdufvcxtijfhip.supabase.co/storage/v1/object/public/vittrine-images/templates/template-video-promo.png',
  'Video promocional vertical de 15 segundos, produto em destaque, transicoes dinamicas, musica trendy',
  '{"duration":15,"format":"vertical","platform":"reels"}',
  true, true, 5430, 2
WHERE NOT EXISTS (SELECT 1 FROM templates WHERE name = 'Video Promo 15s');

INSERT INTO templates (category_id, name, description, type, thumbnail_url, prompt_template, settings, is_premium, is_active, usage_count, sort_order)
SELECT
  (SELECT id FROM template_categories WHERE slug = 'eletronicos'),
  'Story Instagram Promo',
  'Template de story promocional para Instagram comCTA integrado.',
  'image',
  'https://mlqawjbdufvcxtijfhip.supabase.co/storage/v1/object/public/vittrine-images/templates/template-story-instagram.png',
  'Story promocional de Instagram, layout com texto e CTA, cores vibrantes, formato 9:16',
  '{"aspect_ratio":"9:16","quality":"high","cta_button":true}',
  false, true, 2180, 3
WHERE NOT EXISTS (SELECT 1 FROM templates WHERE name = 'Story Instagram Promo');

INSERT INTO templates (category_id, name, description, type, thumbnail_url, prompt_template, settings, is_premium, is_active, usage_count, sort_order)
SELECT
  (SELECT id FROM template_categories WHERE slug = 'beleza'),
  'Anuncio TikTok Shop',
  'Anuncio otimizado para TikTok Shop com estilo viral.',
  'copywriting',
  'https://mlqawjbdufvcxtijfhip.supabase.co/storage/v1/object/public/vittrine-images/templates/template-anuncio-tiktok.png',
  'Anuncio para TikTok Shop, titulo chamativo, descricao com emojis e hashtags trending',
  '{"platform":"tiktok","max_chars":300,"include_hashtags":true}',
  true, true, 1890, 4
WHERE NOT EXISTS (SELECT 1 FROM templates WHERE name = 'Anuncio TikTok Shop');

INSERT INTO templates (category_id, name, description, type, thumbnail_url, prompt_template, settings, is_premium, is_active, usage_count, sort_order)
SELECT
  (SELECT id FROM template_categories WHERE slug = 'fitness'),
  'Post Shopee Destaque',
  'Post otimizado para destaque na Shopee com banner promocional.',
  'image',
  'https://mlqawjbdufvcxtijfhip.supabase.co/storage/v1/object/public/vittrine-images/templates/template-post-shopee.png',
  'Imagem promocional estilo Shopee, banner com desconto, fundo vermelho, estilo marketplace',
  '{"aspect_ratio":"1:1","quality":"high","overlay_text":true}',
  false, true, 4560, 5
WHERE NOT EXISTS (SELECT 1 FROM templates WHERE name = 'Post Shopee Destaque');

INSERT INTO templates (category_id, name, description, type, thumbnail_url, prompt_template, settings, is_premium, is_active, usage_count, sort_order)
SELECT
  (SELECT id FROM template_categories WHERE slug = 'acessorios'),
  'Anuncio Mercado Livre',
  'Anuncio completo para Mercado Livre com titulo e specs.',
  'image',
  'https://mlqawjbdufvcxtijfhip.supabase.co/storage/v1/object/public/vittrine-images/templates/template-anuncio-ml.png',
  'Foto de produto premium para Mercado Livre, fundo neutro, iluminacao profissional, detalhes visiveis',
  '{"aspect_ratio":"1:1","quality":"high","marketplace":"mercadolivre"}',
  true, true, 3870, 6
WHERE NOT EXISTS (SELECT 1 FROM templates WHERE name = 'Anuncio Mercado Livre');

INSERT INTO templates (category_id, name, description, type, thumbnail_url, prompt_template, settings, is_premium, is_active, usage_count, sort_order)
SELECT
  (SELECT id FROM template_categories WHERE slug = 'casa-decoracao'),
  'Banner Carousel Amazon',
  'Banner horizontal para carousel de anuncios Amazon.',
  'image',
  'https://mlqawjbdufvcxtijfhip.supabase.co/storage/v1/object/public/vittrine-images/templates/template-banner-amazon.png',
  'Banner horizontal para Amazon, layout carousel, lifestyle com produto, iluminacao quente',
  '{"aspect_ratio":"16:9","quality":"high","marketplace":"amazon"}',
  false, true, 2750, 7
WHERE NOT EXISTS (SELECT 1 FROM templates WHERE name = 'Banner Carousel Amazon');

INSERT INTO templates (category_id, name, description, type, thumbnail_url, prompt_template, settings, is_premium, is_active, usage_count, sort_order)
SELECT
  (SELECT id FROM template_categories WHERE slug = 'pet'),
  'Copy Vitrine Shein',
  'Copywriting otimizado para vitrine de produtos na Shein.',
  'copywriting',
  'https://mlqawjbdufvcxtijfhip.supabase.co/storage/v1/object/public/vittrine-images/templates/template-copy-shein.png',
  'Descricao de produto para Shein, titulo com palavras-chave, bullets com beneficios, tom jovem',
  '{"platform":"shein","max_chars":500,"include_emoji":true}',
  false, true, 1520, 8
WHERE NOT EXISTS (SELECT 1 FROM templates WHERE name = 'Copy Vitrine Shein');

-- -------------------------------------------
-- TRENDING PRODUCTS
-- -------------------------------------------
INSERT INTO trending_products (product_name, category, marketplace, trend_score, growth_rate, image_url, source_url, data_source, metadata, is_active, published_at)
SELECT'Vestido Midi Floral', 'Moda Feminina', 'shopee', 94, 67.30,
 'https://mlqawjbdufvcxtijfhip.supabase.co/storage/v1/object/public/vittrine-images/trending/vestido-midi-floral.png',
 'https://shopee.com.br/product/12345', 'api.shopee.com',
 '{"sells_per_day": 185, "price_avg": 79.90, "reviews_avg": 4.7}',
 true, now()
WHERE NOT EXISTS (SELECT 1 FROM trending_products WHERE product_name = 'Vestido Midi Floral');

INSERT INTO trending_products (product_name, category, marketplace, trend_score, growth_rate, image_url, source_url, data_source, metadata, is_active, published_at)
SELECT'Bolsa Tote em Couro', 'Acessorios', 'mercadolivre', 88, 42.50,
 'https://mlqawjbdufvcxtijfhip.supabase.co/storage/v1/object/public/vittrine-images/trending/bolsa-tote-couro.png',
 'https://mercadolivre.com.br/produto/67890', 'api.mercadolivre.com',
 '{"sells_per_day": 92, "price_avg": 149.90, "reviews_avg": 4.5}',
 true, now()
WHERE NOT EXISTS (SELECT 1 FROM trending_products WHERE product_name = 'Bolsa Tote em Couro');

INSERT INTO trending_products (product_name, category, marketplace, trend_score, growth_rate, image_url, source_url, data_source, metadata, is_active, published_at)
SELECT'Kit Skincare Vitamina C', 'Beleza', 'amazon', 91, 78.20,
 'https://mlqawjbdufvcxtijfhip.supabase.co/storage/v1/object/public/vittrine-images/trending/kit-skincare-vitaminac.png',
 'https://amazon.com.br/dp/B0123456789', 'api.amazon.com',
 '{"sells_per_day": 230, "price_avg": 89.90, "reviews_avg": 4.8}',
 true, now()
WHERE NOT EXISTS (SELECT 1 FROM trending_products WHERE product_name = 'Kit Skincare Vitamina C');

INSERT INTO trending_products (product_name, category, marketplace, trend_score, growth_rate, image_url, source_url, data_source, metadata, is_active, published_at)
SELECT'Camiseta Oversized Algodao Organico', 'Moda Masculina', 'tiktok', 85, 55.10,
 'https://mlqawjbdufvcxtijfhip.supabase.co/storage/v1/object/public/vittrine-images/trending/camiseta-oversized-algodao.png',
 'https://tiktok.com/shop/product/11111', 'api.tiktok.com',
 '{"sells_per_day": 145, "price_avg": 59.90, "reviews_avg": 4.6}',
 true, now()
WHERE NOT EXISTS (SELECT 1 FROM trending_products WHERE product_name = 'Camiseta Oversized Algodao Organico');

INSERT INTO trending_products (product_name, category, marketplace, trend_score, growth_rate, image_url, source_url, data_source, metadata, is_active, published_at)
SELECT'Fone Bluetooth TWS', 'Eletronicos', 'shopee', 96, 82.40,
 'https://mlqawjbdufvcxtijfhip.supabase.co/storage/v1/object/public/vittrine-images/trending/fone-bluetooth-tws.png',
 'https://shopee.com.br/product/22222', 'api.shopee.com',
 '{"sells_per_day": 310, "price_avg": 49.90, "reviews_avg": 4.3}',
 true, now()
WHERE NOT EXISTS (SELECT 1 FROM trending_products WHERE product_name = 'Fone Bluetooth TWS');

INSERT INTO trending_products (product_name, category, marketplace, trend_score, growth_rate, image_url, source_url, data_source, metadata, is_active, published_at)
SELECT'Garrafa Termica 1L', 'Casa e Decoracao', 'magalu', 79, 31.80,
 'https://mlqawjbdufvcxtijfhip.supabase.co/storage/v1/object/public/vittrine-images/trending/garrafa-termica-1l.png',
 'https://magazineluiza.com.br/produto/33333', 'api.magalu.com',
 '{"sells_per_day": 120, "price_avg": 69.90, "reviews_avg": 4.4}',
 true, now()
WHERE NOT EXISTS (SELECT 1 FROM trending_products WHERE product_name = 'Garrafa Termica 1L');

INSERT INTO trending_products (product_name, category, marketplace, trend_score, growth_rate, image_url, source_url, data_source, metadata, is_active, published_at)
SELECT'Racao Premium para Caes', 'Pet', 'shein', 76, 28.90,
 'https://mlqawjbdufvcxtijfhip.supabase.co/storage/v1/object/public/vittrine-images/trending/racao-premium-caes.png',
 'https://shein.com/product/44444', 'api.shein.com',
 '{"sells_per_day": 88, "price_avg": 129.90, "reviews_avg": 4.6}',
 true, now()
WHERE NOT EXISTS (SELECT 1 FROM trending_products WHERE product_name = 'Racao Premium para Caes');

INSERT INTO trending_products (product_name, category, marketplace, trend_score, growth_rate, image_url, source_url, data_source, metadata, is_active, published_at)
SELECT'Legging Fitness Compression', 'Fitness', 'tiktok', 83, 49.60,
 'https://mlqawjbdufvcxtijfhip.supabase.co/storage/v1/object/public/vittrine-images/trending/legging-fitness-compression.png',
 'https://tiktok.com/shop/product/55555', 'api.tiktok.com',
 '{"sells_per_day": 165, "price_avg": 44.90, "reviews_avg": 4.5}',
 true, now()
WHERE NOT EXISTS (SELECT 1 FROM trending_products WHERE product_name = 'Legging Fitness Compression');

-- -------------------------------------------
-- COURSES: update thumbnail_url
-- -------------------------------------------
UPDATE courses SET thumbnail_url = 'https://mlqawjbdufvcxtijfhip.supabase.co/storage/v1/object/public/vittrine-images/courses/course-shopee.png'
WHERE title = 'Como Vender na Shopee - Do Zero ao Top Seller' AND thumbnail_url IS NULL;

UPDATE courses SET thumbnail_url = 'https://mlqawjbdufvcxtijfhip.supabase.co/storage/v1/object/public/vittrine-images/courses/course-amazon.png'
WHERE title = 'Amazon FBA: Guia Completo para Brasileiros' AND thumbnail_url IS NULL;

UPDATE courses SET thumbnail_url = 'https://mlqawjbdufvcxtijfhip.supabase.co/storage/v1/object/public/vittrine-images/courses/course-tiktok.png'
WHERE title = 'TikTok Shop: O Novo Eldorado do E-commerce' AND thumbnail_url IS NULL;

UPDATE courses SET thumbnail_url = 'https://mlqawjbdufvcxtijfhip.supabase.co/storage/v1/object/public/vittrine-images/courses/course-videos.png'
WHERE title = 'Criação de Vídeos Virais' AND thumbnail_url IS NULL;

UPDATE courses SET thumbnail_url = 'https://mlqawjbdufvcxtijfhip.supabase.co/storage/v1/object/public/vittrine-images/courses/course-copywriting.png'
WHERE title = 'Copywriting para Marketplaces' AND thumbnail_url IS NULL;

UPDATE courses SET thumbnail_url = 'https://mlqawjbdufvcxtijfhip.supabase.co/storage/v1/object/public/vittrine-images/courses/course-ml.png'
WHERE title = 'Mercado Livre: Estratégias Avançadas' AND thumbnail_url IS NULL;

-- -------------------------------------------
-- COURSE LESSONS
-- -------------------------------------------

-- Course 1: Shopee
INSERT INTO course_lessons (course_id, title, description, video_url, duration_minutes, sort_order, is_published)
SELECT (SELECT id FROM courses WHERE title = 'Como Vender na Shopee - Do Zero ao Top Seller'),
  'Introducao a Shopee', 'Conheça o marketplace que mais cresce no Brasil. Entenda o modelo de negocio, comissoes e como a plataforma funciona para vendedores.',
  NULL, 8, 1, true
WHERE NOT EXISTS (SELECT 1 FROM course_lessons WHERE course_id = (SELECT id FROM courses WHERE title = 'Como Vender na Shopee - Do Zero ao Top Seller') AND title = 'Introducao a Shopee');

INSERT INTO course_lessons (course_id, title, description, video_url, duration_minutes, sort_order, is_published)
SELECT (SELECT id FROM courses WHERE title = 'Como Vender na Shopee - Do Zero ao Top Seller'),
  'Configurando sua Loja', 'Passo a passo para criar e configurar sua loja na Shopee. Cadastro, documentos, dados bancarios e personalizacao da vitrine.',
  NULL, 14, 2, true
WHERE NOT EXISTS (SELECT 1 FROM course_lessons WHERE course_id = (SELECT id FROM courses WHERE title = 'Como Vender na Shopee - Do Zero ao Top Seller') AND title = 'Configurando sua Loja');

INSERT INTO course_lessons (course_id, title, description, video_url, duration_minutes, sort_order, is_published)
SELECT (SELECT id FROM courses WHERE title = 'Como Vender na Shopee - Do Zero ao Top Seller'),
  'Criando Anuncios que Vendem', 'Estrategias para criar titulos, descricoes e fotos que convertem. SEO interno da Shopee e principais erros a evitar.',
  NULL, 18, 3, true
WHERE NOT EXISTS (SELECT 1 FROM course_lessons WHERE course_id = (SELECT id FROM courses WHERE title = 'Como Vender na Shopee - Do Zero ao Top Seller') AND title = 'Criando Anuncios que Vendem');

INSERT INTO course_lessons (course_id, title, description, video_url, duration_minutes, sort_order, is_published)
SELECT (SELECT id FROM courses WHERE title = 'Como Vender na Shopee - Do Zero ao Top Seller'),
  'Shopee Ads: Trafego Pago', 'Como usar o Shopee Ads para impulsionar vendas. Orcamento, segmentacao, lances e analise de resultados.',
  NULL, 15, 4, true
WHERE NOT EXISTS (SELECT 1 FROM course_lessons WHERE course_id = (SELECT id FROM courses WHERE title = 'Como Vender na Shopee - Do Zero ao Top Seller') AND title = 'Shopee Ads: Trafego Pago');

-- Course 2: Amazon
INSERT INTO course_lessons (course_id, title, description, video_url, duration_minutes, sort_order, is_published)
SELECT (SELECT id FROM courses WHERE title = 'Amazon FBA: Guia Completo para Brasileiros'),
  'O que e Amazon FBA', 'Entenda o programa Fulfillment by Amazon, como funciona a logistica reversa e os custos envolvidos.',
  NULL, 10, 1, true
WHERE NOT EXISTS (SELECT 1 FROM course_lessons WHERE course_id = (SELECT id FROM courses WHERE title = 'Amazon FBA: Guia Completo para Brasileiros') AND title = 'O que e Amazon FBA');

INSERT INTO course_lessons (course_id, title, description, video_url, duration_minutes, sort_order, is_published)
SELECT (SELECT id FROM courses WHERE title = 'Amazon FBA: Guia Completo para Brasileiros'),
  'Importacao e Envio para o FBA', 'Processo completo de importacao, despacho aduaneiro e envio dos produtos para os centros de distribuicao da Amazon.',
  NULL, 16, 2, true
WHERE NOT EXISTS (SELECT 1 FROM course_lessons WHERE course_id = (SELECT id FROM courses WHERE title = 'Amazon FBA: Guia Completo para Brasileiros') AND title = 'Importacao e Envio para o FBA');

INSERT INTO course_lessons (course_id, title, description, video_url, duration_minutes, sort_order, is_published)
SELECT (SELECT id FROM courses WHERE title = 'Amazon FBA: Guia Completo para Brasileiros'),
  'Listing Otimizado', 'Como criar um listing com alta conversao. Keywords, fotos, A+ Content e estrategia de precos.',
  NULL, 14, 3, true
WHERE NOT EXISTS (SELECT 1 FROM course_lessons WHERE course_id = (SELECT id FROM courses WHERE title = 'Amazon FBA: Guia Completo para Brasileiros') AND title = 'Listing Otimizado');

-- Course 3: TikTok
INSERT INTO course_lessons (course_id, title, description, video_url, duration_minutes, sort_order, is_published)
SELECT (SELECT id FROM courses WHERE title = 'TikTok Shop: O Novo Eldorado do E-commerce'),
  'Introducao ao TikTok Shop', 'Entenda como funciona o TikTok Shop no Brasil. Requisitos, configuracao e integracao com loja virtual.',
  NULL, 8, 1, true
WHERE NOT EXISTS (SELECT 1 FROM course_lessons WHERE course_id = (SELECT id FROM courses WHERE title = 'TikTok Shop: O Novo Eldorado do E-commerce') AND title = 'Introducao ao TikTok Shop');

INSERT INTO course_lessons (course_id, title, description, video_url, duration_minutes, sort_order, is_published)
SELECT (SELECT id FROM courses WHERE title = 'TikTok Shop: O Novo Eldorado do E-commerce'),
  'Criando Conteudo que Converte', 'Tecnicas de filmagem, edicao e storytelling para criar videos que geram vendas no TikTok.',
  NULL, 12, 2, true
WHERE NOT EXISTS (SELECT 1 FROM course_lessons WHERE course_id = (SELECT id FROM courses WHERE title = 'TikTok Shop: O Novo Eldorado do E-commerce') AND title = 'Criando Conteudo que Converte');

INSERT INTO course_lessons (course_id, title, description, video_url, duration_minutes, sort_order, is_published)
SELECT (SELECT id FROM courses WHERE title = 'TikTok Shop: O Novo Eldorado do E-commerce'),
  'Live Selling: Vendas ao Vivo', 'Estrategias para fazer lives que vendem. Preparacao, engajamento e tecnicas de close de vendas.',
  NULL, 16, 3, true
WHERE NOT EXISTS (SELECT 1 FROM course_lessons WHERE course_id = (SELECT id FROM courses WHERE title = 'TikTok Shop: O Novo Eldorado do E-commerce') AND title = 'Live Selling: Vendas ao Vivo');

INSERT INTO course_lessons (course_id, title, description, video_url, duration_minutes, sort_order, is_published)
SELECT (SELECT id FROM courses WHERE title = 'TikTok Shop: O Novo Eldorado do E-commerce'),
  'Afiliados e Parcerias', 'Como usar o programa de afiliados do TikTok para escalar vendas com criadores de conteudo.',
  NULL, 10, 4, true
WHERE NOT EXISTS (SELECT 1 FROM course_lessons WHERE course_id = (SELECT id FROM courses WHERE title = 'TikTok Shop: O Novo Eldorado do E-commerce') AND title = 'Afiliados e Parcerias');

-- Course 4: Videos Virais
INSERT INTO course_lessons (course_id, title, description, video_url, duration_minutes, sort_order, is_published)
SELECT (SELECT id FROM courses WHERE title = 'Criação de Vídeos Virais'),
  'Psicologia do Conteudo Viral', 'Entenda o que faz um conteudo viralizar. Gatilhos mentais, hooks e estruturas comprovadas.',
  NULL, 10, 1, true
WHERE NOT EXISTS (SELECT 1 FROM course_lessons WHERE course_id = (SELECT id FROM courses WHERE title = 'Criação de Vídeos Virais') AND title = 'Psicologia do Conteudo Viral');

INSERT INTO course_lessons (course_id, title, description, video_url, duration_minutes, sort_order, is_published)
SELECT (SELECT id FROM courses WHERE title = 'Criação de Vídeos Virais'),
  'Filmagem com Smartphone', 'Tecnicas de filmagem profissional usando apenas seu celular. Iluminacao, angulos e enquadramento.',
  NULL, 12, 2, true
WHERE NOT EXISTS (SELECT 1 FROM course_lessons WHERE course_id = (SELECT id FROM courses WHERE title = 'Criação de Vídeos Virais') AND title = 'Filmagem com Smartphone');

INSERT INTO course_lessons (course_id, title, description, video_url, duration_minutes, sort_order, is_published)
SELECT (SELECT id FROM courses WHERE title = 'Criação de Vídeos Virais'),
  'Edicao Rapida e Efeitos', 'Edicao eficiente com ferramentas gratuitas. Cortes, transicoes, legendas e efeitos sonoros.',
  NULL, 14, 3, true
WHERE NOT EXISTS (SELECT 1 FROM course_lessons WHERE course_id = (SELECT id FROM courses WHERE title = 'Criação de Vídeos Virais') AND title = 'Edicao Rapida e Efeitos');

-- Course 5: Copywriting
INSERT INTO course_lessons (course_id, title, description, video_url, duration_minutes, sort_order, is_published)
SELECT (SELECT id FROM courses WHERE title = 'Copywriting para Marketplaces'),
  'Fundamentos de Copy para E-commerce', 'Principios basicos de copywriting aplicados a marketplaces. Headlines que vendem e descricoes persuasivas.',
  NULL, 12, 1, true
WHERE NOT EXISTS (SELECT 1 FROM course_lessons WHERE course_id = (SELECT id FROM courses WHERE title = 'Copywriting para Marketplaces') AND title = 'Fundamentos de Copy para E-commerce');

INSERT INTO course_lessons (course_id, title, description, video_url, duration_minutes, sort_order, is_published)
SELECT (SELECT id FROM courses WHERE title = 'Copywriting para Marketplaces'),
  'SEO para Marketplaces', 'Como usar palavras-chave estrategicas para aparecer nas primeiras posicoes de busca de cada marketplace.',
  NULL, 14, 2, true
WHERE NOT EXISTS (SELECT 1 FROM course_lessons WHERE course_id = (SELECT id FROM courses WHERE title = 'Copywriting para Marketplaces') AND title = 'SEO para Marketplaces');

INSERT INTO course_lessons (course_id, title, description, video_url, duration_minutes, sort_order, is_published)
SELECT (SELECT id FROM courses WHERE title = 'Copywriting para Marketplaces'),
  'Descricao por Marketplace', 'Diferencas e boas praticas para escrever descricoes otimizadas na Shopee, Amazon, ML e TikTok.',
  NULL, 16, 3, true
WHERE NOT EXISTS (SELECT 1 FROM course_lessons WHERE course_id = (SELECT id FROM courses WHERE title = 'Copywriting para Marketplaces') AND title = 'Descricao por Marketplace');

INSERT INTO course_lessons (course_id, title, description, video_url, duration_minutes, sort_order, is_published)
SELECT (SELECT id FROM courses WHERE title = 'Copywriting para Marketplaces'),
  'A/B Testing e Otimizacao', 'Como testar diferentes versoes de copy e otimizar baseado em dados reais de conversao.',
  NULL, 10, 4, true
WHERE NOT EXISTS (SELECT 1 FROM course_lessons WHERE course_id = (SELECT id FROM courses WHERE title = 'Copywriting para Marketplaces') AND title = 'A/B Testing e Otimizacao');

-- Course 6: Mercado Livre
INSERT INTO course_lessons (course_id, title, description, video_url, duration_minutes, sort_order, is_published)
SELECT (SELECT id FROM courses WHERE title = 'Mercado Livre: Estratégias Avançadas'),
  'Algoritmo do Mercado Livre', 'Entenda como o algoritmo de busca do ML funciona e como posicionar seus anuncios no topo.',
  NULL, 12, 1, true
WHERE NOT EXISTS (SELECT 1 FROM course_lessons WHERE course_id = (SELECT id FROM courses WHERE title = 'Mercado Livre: Estratégias Avançadas') AND title = 'Algoritmo do Mercado Livre');

INSERT INTO course_lessons (course_id, title, description, video_url, duration_minutes, sort_order, is_published)
SELECT (SELECT id FROM courses WHERE title = 'Mercado Livre: Estratégias Avançadas'),
  'Full e Gestion', 'Vantagens e estrategias para usar o Full (logistica) e Gestion (gestao) do Mercado Livre.',
  NULL, 16, 2, true
WHERE NOT EXISTS (SELECT 1 FROM course_lessons WHERE course_id = (SELECT id FROM courses WHERE title = 'Mercado Livre: Estratégias Avançadas') AND title = 'Full e Gestion');

INSERT INTO course_lessons (course_id, title, description, video_url, duration_minutes, sort_order, is_published)
SELECT (SELECT id FROM courses WHERE title = 'Mercado Livre: Estratégias Avançadas'),
  'Precificacao e Promocoes', 'Estrategias de precificacao dinamica, cupons, frete gratis e promocoes para maximizar conversao.',
  NULL, 14, 3, true
WHERE NOT EXISTS (SELECT 1 FROM course_lessons WHERE course_id = (SELECT id FROM courses WHERE title = 'Mercado Livre: Estratégias Avançadas') AND title = 'Precificacao e Promocoes');

-- -------------------------------------------
-- COURSES: sync lessons_count & duration_minutes
-- -------------------------------------------
UPDATE courses SET
  lessons_count = (SELECT count(*)::int FROM course_lessons WHERE course_id = courses.id AND is_published = true),
  duration_minutes = (SELECT COALESCE(sum(duration_minutes), 0)::int FROM course_lessons WHERE course_id = courses.id AND is_published = true)
WHERE title IN (
  'Como Vender na Shopee - Do Zero ao Top Seller',
  'Amazon FBA: Guia Completo para Brasileiros',
  'TikTok Shop: O Novo Eldorado do E-commerce',
  'Criação de Vídeos Virais',
  'Copywriting para Marketplaces',
  'Mercado Livre: Estratégias Avançadas'
);
