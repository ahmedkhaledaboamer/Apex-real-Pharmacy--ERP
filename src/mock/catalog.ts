/**
 * Apex Aora Pharmacy — local catalog seed (no backend).
 *
 * Real, widely available UAE pharmacy products. PRICES ARE ESTIMATES in AED —
 * review them before going live.
 *
 * Photos: put the official photo of each product at
 *   public/images/products/<slug>.jpg
 * (slug = the `slug` field below). Until a photo exists, the site falls back to
 * a neutral drawing at public/images/products/<slug>.svg (no brand logo).
 *
 * Self-contained on purpose (no imports) so scripts/gen-product-art.ts can load
 * it directly with Node. After editing, bump DB_VERSION in server.ts so
 * browsers reload the catalog.
 */

export type Pack = 'box' | 'bottle' | 'syrup' | 'tube' | 'pump' | 'spray' | 'dropper' | 'jar' | 'sachet' | 'device' | 'effervescent';
type T = [en: string, ar: string];

export interface SeedCategory {
  key: string;
  name: string;
  nameAr: string;
  /** Accent colour used for the generated artwork. */
  tone: string;
  subs: T[];
}

export interface SeedBrand {
  key: string;
  name: string;
  nameAr: string;
  /** false when there is no logo file at public/images/brands/<key>.png */
  logo?: boolean;
}

export interface SeedProduct {
  slug: string;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  category: string;
  sub: number;
  brand: string;
  price: number;
  sale?: number;
  quantity: number;
  sold: number;
  rating: number;
  featured?: boolean;
  pack: Pack;
  /** Generic (non-brand) name printed on the fallback drawing. */
  label: string;
  strength?: string;
  benefits: T[];
  ingredients: T[];
  directions: T;
  sizes: T[];
}

export const CATEGORIES: SeedCategory[] = [
  { key: 'pain', name: 'Pain & Fever', nameAr: 'المسكنات وخافض الحرارة', tone: '#D93F5C', subs: [['Tablets', 'أقراص'], ['Gels & Rubs', 'جل ومراهم'], ["Children's Relief", 'مسكنات الأطفال']] },
  { key: 'cold', name: 'Cold & Flu', nameAr: 'البرد والإنفلونزا', tone: '#1F8FD6', subs: [['Cough', 'الكحة'], ['Nasal Care', 'العناية بالأنف'], ['Throat', 'الحلق']] },
  { key: 'vit', name: 'Vitamins & Supplements', nameAr: 'الفيتامينات والمكملات', tone: '#F29B12', subs: [['Multivitamins', 'فيتامينات متعددة'], ['Immunity', 'المناعة'], ['Heart & Omega', 'القلب والأوميغا'], ['Bones & Joints', 'العظام والمفاصل']] },
  { key: 'skin', name: 'Skin Care', nameAr: 'العناية بالبشرة', tone: '#7A1FB8', subs: [['Acne Care', 'علاج حب الشباب'], ['Serums', 'السيروم'], ['Moisturizers & Repair', 'المرطبات والترميم']] },
  { key: 'sun', name: 'Sun Protection', nameAr: 'الحماية من الشمس', tone: '#F2B705', subs: [['Face', 'الوجه'], ['Body & Kids', 'الجسم والأطفال'], ['After Sun', 'بعد التعرض للشمس']] },
  { key: 'baby', name: 'Mother & Baby', nameAr: 'الأم والطفل', tone: '#EC6FA8', subs: [['Baby Skin', 'بشرة الطفل'], ['Bath & Wipes', 'الاستحمام والمناديل'], ['Mother Care', 'عناية الأم']] },
  { key: 'personal', name: 'Personal Care', nameAr: 'العناية الشخصية', tone: '#13A89E', subs: [['Oral Care', 'العناية بالفم'], ['Hair Care', 'العناية بالشعر'], ['Hygiene', 'النظافة الشخصية']] },
  { key: 'devices', name: 'Medical Devices', nameAr: 'الأجهزة الطبية', tone: '#0672DF', subs: [['Monitors', 'أجهزة القياس'], ['Thermometers', 'موازين الحرارة']] },
  { key: 'aid', name: 'First Aid', nameAr: 'الإسعافات الأولية', tone: '#E0452B', subs: [['Wound Care', 'العناية بالجروح'], ['Antiseptics', 'المطهرات']] }
];

export const BRANDS: SeedBrand[] = [
  { key: 'panadol', name: 'Panadol', nameAr: 'بنادول' },
  { key: 'brufen', name: 'Brufen', nameAr: 'بروفين', logo: false },
  { key: 'calpol', name: 'Calpol', nameAr: 'كالبول' },
  { key: 'voltaren', name: 'Voltaren', nameAr: 'فولتارين' },
  { key: 'deepheat', name: 'Deep Heat', nameAr: 'ديب هيت' },
  { key: 'prospan', name: 'Prospan', nameAr: 'بروسبان' },
  { key: 'sterimar', name: 'Stérimar', nameAr: 'ستيريمار' },
  { key: 'strepsils', name: 'Strepsils', nameAr: 'ستربسلز' },
  { key: 'vicks', name: 'Vicks', nameAr: 'فيكس' },
  { key: 'otrivin', name: 'Otrivin', nameAr: 'أوتريفين' },
  { key: 'centrum', name: 'Centrum', nameAr: 'سنتروم' },
  { key: 'redoxon', name: 'Redoxon', nameAr: 'ريدوكسون' },
  { key: 'naturesbounty', name: "Nature's Bounty", nameAr: 'نيتشرز باونتي' },
  { key: 'sevenseas', name: 'Seven Seas', nameAr: 'سفن سيز' },
  { key: 'caltrate', name: 'Caltrate', nameAr: 'كالتريت' },
  { key: 'vitabiotics', name: 'Vitabiotics', nameAr: 'فيتابيوتكس' },
  { key: 'cerave', name: 'CeraVe', nameAr: 'سيرافي' },
  { key: 'lrp', name: 'La Roche-Posay', nameAr: 'لاروش بوزيه' },
  { key: 'ordinary', name: 'The Ordinary', nameAr: 'ذا أورديناري' },
  { key: 'bioderma', name: 'Bioderma', nameAr: 'بيوديرما' },
  { key: 'avene', name: 'Avène', nameAr: 'أفين' },
  { key: 'nivea', name: 'Nivea', nameAr: 'نيفيا' },
  { key: 'sudocrem', name: 'Sudocrem', nameAr: 'سودوكريم' },
  { key: 'bepanthen', name: 'Bepanthen', nameAr: 'بيبانثين' },
  { key: 'mustela', name: 'Mustela', nameAr: 'موستيلا' },
  { key: 'waterwipes', name: 'WaterWipes', nameAr: 'ووتر وايبس' },
  { key: 'lansinoh', name: 'Lansinoh', nameAr: 'لانسينوه' },
  { key: 'sensodyne', name: 'Sensodyne', nameAr: 'سنسوداين' },
  { key: 'listerine', name: 'Listerine', nameAr: 'ليسترين' },
  { key: 'vichy', name: 'Vichy', nameAr: 'فيشي' },
  { key: 'dettol', name: 'Dettol', nameAr: 'ديتول' },
  { key: 'carmex', name: 'Carmex', nameAr: 'كارمكس' },
  { key: 'omron', name: 'Omron', nameAr: 'أومرون' },
  { key: 'braun', name: 'Braun', nameAr: 'براون' },
  { key: 'beurer', name: 'Beurer', nameAr: 'بيورر' },
  { key: 'accuchek', name: 'Accu-Chek', nameAr: 'أكيو-تشيك' },
  { key: 'hansaplast', name: 'Hansaplast', nameAr: 'هانزابلاست' },
  { key: 'betadine', name: 'Betadine', nameAr: 'بيتادين' }
];

const PHARMACIST: T = ['Read the leaflet before use. Ask our pharmacist if you are pregnant, breastfeeding, or taking other medicines.', 'اقرأ النشرة قبل الاستخدام. استشر الصيدلي إذا كنتِ حاملاً أو مرضعة أو تتناول أدوية أخرى.'];
const join = (a: T, b: T): T => [`${a[0]} ${b[0]}`, `${a[1]} ${b[1]}`];

export const PRODUCTS: SeedProduct[] = [
  /* ------------------------------ Pain & Fever ----------------------------- */
  {
    slug: 'panadol-advance-500mg-24', title: 'Panadol Advance 500mg, 24 Tablets', titleAr: 'بنادول أدفانس 500 ملغ، 24 قرصاً',
    description: 'Paracetamol with Optizorb technology for fast, effective relief of headache, toothache, muscle aches and fever.',
    descriptionAr: 'باراسيتامول بتقنية أوبتيزورب لتسكين سريع وفعال للصداع وآلام الأسنان والعضلات وخفض الحرارة.',
    category: 'pain', sub: 0, brand: 'panadol', price: 11, quantity: 240, sold: 1320, rating: 4.8, featured: true, pack: 'box', label: 'Paracetamol', strength: '500 mg',
    benefits: [['Fast-absorbing formula', 'تركيبة سريعة الامتصاص'], ['Relieves pain and fever', 'يسكن الألم ويخفض الحرارة'], ['Gentle on the stomach', 'لطيف على المعدة']],
    ingredients: [['Paracetamol 500 mg', 'باراسيتامول 500 ملغ']],
    directions: join(['Adults and children 12+: 1–2 tablets every 4–6 hours as needed. Max 8 tablets in 24 hours.', 'البالغون والأطفال من 12 سنة: قرص إلى قرصين كل 4–6 ساعات عند الحاجة. بحد أقصى 8 أقراص خلال 24 ساعة.'], PHARMACIST),
    sizes: [['24 tablets', '24 قرصاً']]
  },
  {
    slug: 'panadol-extra-24', title: 'Panadol Extra, 24 Tablets', titleAr: 'بنادول إكسترا، 24 قرصاً',
    description: 'Paracetamol plus caffeine for extra-strength relief of tension headaches, migraine and period pain.',
    descriptionAr: 'باراسيتامول مع الكافيين لتسكين أقوى لصداع التوتر والصداع النصفي وآلام الدورة الشهرية.',
    category: 'pain', sub: 0, brand: 'panadol', price: 13, quantity: 200, sold: 980, rating: 4.7, pack: 'box', label: 'Paracetamol + Caffeine', strength: '500/65 mg',
    benefits: [['Extra strength for headaches', 'قوة إضافية للصداع'], ['Caffeine boosts effectiveness', 'الكافيين يعزز الفعالية'], ['Trusted everyday relief', 'تسكين يومي موثوق']],
    ingredients: [['Paracetamol 500 mg', 'باراسيتامول 500 ملغ'], ['Caffeine 65 mg', 'كافيين 65 ملغ']],
    directions: join(['Adults and children 12+: 1–2 tablets every 4–6 hours. Max 8 tablets in 24 hours. Limit other caffeine.', 'البالغون والأطفال من 12 سنة: قرص إلى قرصين كل 4–6 ساعات. بحد أقصى 8 أقراص خلال 24 ساعة. قلل من الكافيين الآخر.'], PHARMACIST),
    sizes: [['24 tablets', '24 قرصاً']]
  },
  {
    slug: 'brufen-400mg-30', title: 'Brufen 400mg, 30 Tablets', titleAr: 'بروفين 400 ملغ، 30 قرصاً',
    description: 'Ibuprofen anti-inflammatory for back pain, dental pain, period pain, sprains and fever.',
    descriptionAr: 'إيبوبروفين مضاد للالتهاب لآلام الظهر والأسنان والدورة الشهرية والالتواءات وخفض الحرارة.',
    category: 'pain', sub: 0, brand: 'brufen', price: 15, quantity: 160, sold: 760, rating: 4.6, pack: 'box', label: 'Ibuprofen', strength: '400 mg',
    benefits: [['Reduces inflammation', 'يخفف الالتهاب'], ['Effective for period and dental pain', 'فعال لآلام الدورة والأسنان'], ['Lowers fever', 'يخفض الحرارة']],
    ingredients: [['Ibuprofen 400 mg', 'إيبوبروفين 400 ملغ']],
    directions: join(['Adults: 1 tablet up to 3 times daily after food. Do not take with other anti-inflammatories.', 'البالغون: قرص واحد حتى 3 مرات يومياً بعد الطعام. لا تتناوله مع مضادات التهاب أخرى.'], PHARMACIST),
    sizes: [['30 tablets', '30 قرصاً']]
  },
  {
    slug: 'calpol-infant-suspension-100ml', title: 'Calpol Infant Suspension 120mg/5ml, 100ml', titleAr: 'كالبول شراب للرضع 120 ملغ/5 مل، 100 مل',
    description: 'Strawberry-flavoured, sugar-free paracetamol suspension for fever and pain in babies and young children.',
    descriptionAr: 'شراب باراسيتامول بنكهة الفراولة وخالٍ من السكر لخفض الحرارة وتسكين الألم عند الرضع والأطفال الصغار.',
    category: 'pain', sub: 2, brand: 'calpol', price: 17, quantity: 150, sold: 1010, rating: 4.9, featured: true, pack: 'syrup', label: 'Infant Paracetamol', strength: '120mg/5ml',
    benefits: [['Sugar-free strawberry taste', 'بنكهة الفراولة وخالٍ من السكر'], ['Dosing syringe included', 'يأتي مع حقنة قياس'], ['For babies and young children', 'للرضع والأطفال الصغار']],
    ingredients: [['Paracetamol 120 mg / 5 ml', 'باراسيتامول 120 ملغ / 5 مل']],
    directions: join(['Dose by age as shown on the pack, every 4–6 hours. No more than 4 doses in 24 hours.', 'الجرعة حسب العمر كما هو موضح على العبوة كل 4–6 ساعات. لا تزد عن 4 جرعات خلال 24 ساعة.'], PHARMACIST),
    sizes: [['100 ml', '100 مل']]
  },
  {
    slug: 'voltaren-emulgel-1-50g', title: 'Voltaren Emulgel 1%, 50g', titleAr: 'فولتارين إيمولجيل 1%، 50 غ',
    description: 'Diclofenac gel that targets joint and muscle pain, reducing inflammation and swelling right where it hurts.',
    descriptionAr: 'جل ديكلوفيناك يستهدف آلام المفاصل والعضلات ويخفف الالتهاب والتورم في موضع الألم مباشرة.',
    category: 'pain', sub: 1, brand: 'voltaren', price: 32, sale: 27, quantity: 120, sold: 690, rating: 4.7, pack: 'tube', label: 'Diclofenac Gel', strength: '1%',
    benefits: [['Targets pain at the source', 'يستهدف الألم في مصدره'], ['Non-greasy, cooling gel', 'جل مبرد غير دهني'], ['For back, neck and joint pain', 'لآلام الظهر والرقبة والمفاصل']],
    ingredients: [['Diclofenac diethylamine 1.16%', 'ديكلوفيناك ديإيثيلامين 1.16%']],
    directions: join(['Adults and children 14+: rub gently into the painful area 3–4 times daily. Wash hands after use. Not for broken skin.', 'البالغون والأطفال من 14 سنة: يدلك بلطف على موضع الألم 3–4 مرات يومياً. اغسل يديك بعد الاستخدام. لا يستخدم على جلد مجروح.'], PHARMACIST),
    sizes: [['50 g', '50 غ']]
  },
  {
    slug: 'deep-heat-rub-67g', title: 'Deep Heat Rub, 67g', titleAr: 'ديب هيت مرهم، 67 غ',
    description: 'Warming rub that soothes muscular aches, stiffness and sports strains with deep, penetrating heat.',
    descriptionAr: 'مرهم دافئ يهدئ آلام العضلات والتيبس وإجهاد الرياضة بحرارة عميقة ونافذة.',
    category: 'pain', sub: 1, brand: 'deepheat', price: 22, quantity: 110, sold: 420, rating: 4.5, pack: 'tube', label: 'Heat Rub', strength: '67 g',
    benefits: [['Deep warming relief', 'تسكين بالحرارة العميقة'], ['Ideal for muscle stiffness', 'مثالي لتيبس العضلات'], ['Fast acting', 'سريع المفعول']],
    ingredients: [['Methyl salicylate', 'ساليسيلات الميثيل'], ['Menthol', 'منثول'], ['Eucalyptus oil', 'زيت الأوكالبتوس']],
    directions: ['Adults and children 5+: massage into the affected area up to 3 times daily. Avoid eyes and broken skin.', 'البالغون والأطفال من 5 سنوات: يدلك على المنطقة المصابة حتى 3 مرات يومياً. تجنب العينين والجلد المجروح.'],
    sizes: [['67 g', '67 غ']]
  },

  /* -------------------------------- Cold & Flu ------------------------------ */
  {
    slug: 'prospan-cough-syrup-100ml', title: 'Prospan Cough Syrup, 100ml', titleAr: 'بروسبان شراب للكحة، 100 مل',
    description: 'Ivy leaf extract syrup that loosens mucus and relieves chesty cough — suitable for the whole family.',
    descriptionAr: 'شراب بخلاصة أوراق اللبلاب يذيب البلغم ويخفف الكحة الصدرية، مناسب لجميع أفراد العائلة.',
    category: 'cold', sub: 0, brand: 'prospan', price: 30, quantity: 140, sold: 880, rating: 4.8, featured: true, pack: 'syrup', label: 'Ivy Leaf Cough', strength: '100 ml',
    benefits: [['Plant-based formula', 'تركيبة نباتية'], ['Loosens mucus', 'يذيب البلغم'], ['Sugar- and alcohol-free', 'خالٍ من السكر والكحول']],
    ingredients: [['Ivy leaf dry extract 35 mg / 5 ml', 'خلاصة أوراق اللبلاب الجافة 35 ملغ / 5 مل']],
    directions: join(['Dose by age as on the pack, usually 2–3 times daily.', 'الجرعة حسب العمر كما على العبوة، عادة 2–3 مرات يومياً.'], PHARMACIST),
    sizes: [['100 ml', '100 مل']]
  },
  {
    slug: 'sterimar-nasal-hygiene-100ml', title: 'Stérimar Nasal Hygiene Spray, 100ml', titleAr: 'ستيريمار بخاخ لتنظيف الأنف، 100 مل',
    description: 'Natural sea-water micro-spray that gently cleans the nose, relieves dryness and helps clear congestion.',
    descriptionAr: 'بخاخ رذاذ دقيق من ماء البحر الطبيعي ينظف الأنف بلطف ويخفف الجفاف ويساعد على إزالة الاحتقان.',
    category: 'cold', sub: 1, brand: 'sterimar', price: 45, quantity: 100, sold: 540, rating: 4.7, pack: 'spray', label: 'Sea Water Nasal', strength: '100 ml',
    benefits: [['Drug-free', 'خالٍ من الأدوية'], ['Daily nasal hygiene', 'تنظيف يومي للأنف'], ['Gentle micro-diffusion', 'رذاذ دقيق ولطيف']],
    ingredients: [['Purified sea water', 'ماء بحر منقى']],
    directions: ['1–2 sprays in each nostril up to 6 times daily, then blow the nose.', 'بخة إلى بختين في كل فتحة أنف حتى 6 مرات يومياً ثم تمخط.'],
    sizes: [['100 ml', '100 مل']]
  },
  {
    slug: 'strepsils-honey-lemon-24', title: 'Strepsils Honey & Lemon, 24 Lozenges', titleAr: 'ستربسلز بالعسل والليمون، 24 قرص استحلاب',
    description: 'Antiseptic lozenges that soothe sore throat discomfort with a classic honey and lemon flavour.',
    descriptionAr: 'أقراص استحلاب مطهرة تهدئ التهاب الحلق بنكهة العسل والليمون الكلاسيكية.',
    category: 'cold', sub: 2, brand: 'strepsils', price: 17, quantity: 220, sold: 1150, rating: 4.7, pack: 'box', label: 'Throat Lozenges', strength: '24 lozenges',
    benefits: [['Soothes sore throat', 'يهدئ التهاب الحلق'], ['Double antiseptic action', 'مفعول مطهر مزدوج'], ['Pleasant taste', 'طعم لذيذ']],
    ingredients: [['Amylmetacresol 0.6 mg', 'أميل ميتاكريزول 0.6 ملغ'], ['2,4-Dichlorobenzyl alcohol 1.2 mg', 'كحول 2،4-ثنائي كلورو البنزيل 1.2 ملغ']],
    directions: ['Adults and children 6+: dissolve 1 lozenge slowly every 2–3 hours. Max 12 in 24 hours.', 'البالغون والأطفال من 6 سنوات: استحلب قرصاً واحداً ببطء كل 2–3 ساعات. بحد أقصى 12 خلال 24 ساعة.'],
    sizes: [['24 lozenges', '24 قرصاً']]
  },
  {
    slug: 'vicks-vaporub-50g', title: 'Vicks VapoRub, 50g', titleAr: 'فيكس فابوراب، 50 غ',
    description: 'The classic chest rub with menthol, camphor and eucalyptus vapours to relieve a blocked nose and cough.',
    descriptionAr: 'المرهم الكلاسيكي للصدر بأبخرة المنثول والكافور والأوكالبتوس لتخفيف انسداد الأنف والكحة.',
    category: 'cold', sub: 1, brand: 'vicks', price: 20, quantity: 180, sold: 940, rating: 4.8, pack: 'jar', label: 'Vapour Rub', strength: '50 g',
    benefits: [['Relieves nasal congestion', 'يخفف احتقان الأنف'], ['Soothing vapours', 'أبخرة مهدئة'], ['Helps you sleep better', 'يساعد على النوم بشكل أفضل']],
    ingredients: [['Camphor 4.8%', 'كافور 4.8%'], ['Menthol 2.6%', 'منثول 2.6%'], ['Eucalyptus oil 1.2%', 'زيت الأوكالبتوس 1.2%']],
    directions: ['Adults and children 2+: rub on chest and throat up to 3 times daily. Do not use in or under the nose.', 'البالغون والأطفال من سنتين: يدهن على الصدر والحلق حتى 3 مرات يومياً. لا تضعه داخل الأنف أو تحته.'],
    sizes: [['50 g', '50 غ']]
  },
  {
    slug: 'otrivin-adult-nasal-spray-10ml', title: 'Otrivin 0.1% Adult Nasal Spray, 10ml', titleAr: 'أوتريفين 0.1% بخاخ أنف للكبار، 10 مل',
    description: 'Fast-acting decongestant spray that clears a blocked nose within minutes and lasts up to 10 hours.',
    descriptionAr: 'بخاخ مزيل للاحتقان سريع المفعول يفتح الأنف المسدود خلال دقائق ويدوم حتى 10 ساعات.',
    category: 'cold', sub: 1, brand: 'otrivin', price: 18, quantity: 150, sold: 820, rating: 4.6, pack: 'spray', label: 'Decongestant', strength: '0.1%',
    benefits: [['Works in minutes', 'يعمل خلال دقائق'], ['Up to 10 hours relief', 'راحة حتى 10 ساعات'], ['With moisturising agents', 'مع مواد مرطبة']],
    ingredients: [['Xylometazoline hydrochloride 0.1%', 'هيدروكلوريد الزيلوميتازولين 0.1%']],
    directions: join(['Adults and children 12+: 1 spray in each nostril up to 3 times daily. Do not use for more than 7 days.', 'البالغون والأطفال من 12 سنة: بخة في كل فتحة أنف حتى 3 مرات يومياً. لا تستخدمه أكثر من 7 أيام.'], PHARMACIST),
    sizes: [['10 ml', '10 مل']]
  },

  /* ------------------------- Vitamins & Supplements ------------------------- */
  {
    slug: 'centrum-adults-30', title: 'Centrum Adults Multivitamin, 30 Tablets', titleAr: 'سنتروم متعدد الفيتامينات للبالغين، 30 قرصاً',
    description: 'A complete A-to-Zinc multivitamin and mineral formula to support energy, immunity and overall wellbeing.',
    descriptionAr: 'تركيبة متكاملة من الفيتامينات والمعادن من الألف إلى الزنك لدعم الطاقة والمناعة والصحة العامة.',
    category: 'vit', sub: 0, brand: 'centrum', price: 55, sale: 47, quantity: 130, sold: 1100, rating: 4.8, featured: true, pack: 'bottle', label: 'Multivitamin', strength: '30 tablets',
    benefits: [['Supports energy and immunity', 'يدعم الطاقة والمناعة'], ['Complete A-to-Zinc formula', 'تركيبة متكاملة من الألف إلى الزنك'], ['One tablet a day', 'قرص واحد يومياً']],
    ingredients: [['Vitamins A, B-complex, C, D, E, K', 'فيتامينات أ، ب المركب، سي، د، هـ، ك'], ['Iron, Zinc, Magnesium, Selenium', 'حديد، زنك، مغنيسيوم، سيلينيوم']],
    directions: ['Adults: 1 tablet daily with food.', 'البالغون: قرص واحد يومياً مع الطعام.'],
    sizes: [['30 tablets', '30 قرصاً'], ['60 tablets', '60 قرصاً']]
  },
  {
    slug: 'centrum-women-30', title: 'Centrum Women Multivitamin, 30 Tablets', titleAr: 'سنتروم للنساء متعدد الفيتامينات، 30 قرصاً',
    description: "Multivitamin tailored to women's needs with iron, folic acid and B-vitamins for energy and vitality.",
    descriptionAr: 'فيتامينات متعددة مصممة لاحتياجات المرأة مع الحديد وحمض الفوليك وفيتامينات ب للطاقة والحيوية.',
    category: 'vit', sub: 0, brand: 'centrum', price: 65, quantity: 90, sold: 610, rating: 4.7, pack: 'bottle', label: 'Women Multivitamin', strength: '30 tablets',
    benefits: [['Supports energy release', 'يدعم إنتاج الطاقة'], ['With iron and folic acid', 'مع الحديد وحمض الفوليك'], ['Supports bones and immunity', 'يدعم العظام والمناعة']],
    ingredients: [['Iron', 'حديد'], ['Folic acid', 'حمض الفوليك'], ['Vitamins B, C, D', 'فيتامينات ب، سي، د']],
    directions: ['Adults: 1 tablet daily with food.', 'البالغون: قرص واحد يومياً مع الطعام.'],
    sizes: [['30 tablets', '30 قرصاً']]
  },
  {
    slug: 'redoxon-double-action-15', title: 'Redoxon Double Action Vitamin C + Zinc, 15 Effervescent Tablets', titleAr: 'ريدوكسون دبل أكشن فيتامين سي + زنك، 15 قرصاً فواراً',
    description: 'High-strength vitamin C with zinc in a refreshing orange effervescent tablet to support your immune system.',
    descriptionAr: 'فيتامين سي بتركيز عالٍ مع الزنك في قرص فوار منعش بنكهة البرتقال لدعم جهاز المناعة.',
    category: 'vit', sub: 1, brand: 'redoxon', price: 30, quantity: 200, sold: 1250, rating: 4.8, pack: 'effervescent', label: 'Vitamin C + Zinc', strength: '1000 mg',
    benefits: [['Supports immunity', 'يدعم المناعة'], ['Vitamin C and zinc together', 'فيتامين سي والزنك معاً'], ['Tasty orange flavour', 'نكهة برتقال لذيذة']],
    ingredients: [['Vitamin C 1000 mg', 'فيتامين سي 1000 ملغ'], ['Zinc 10 mg', 'زنك 10 ملغ']],
    directions: ['Adults: dissolve 1 tablet in a glass of water once daily.', 'البالغون: أذب قرصاً واحداً في كوب ماء مرة يومياً.'],
    sizes: [['15 tablets', '15 قرصاً'], ['30 tablets', '30 قرصاً']]
  },
  {
    slug: 'natures-bounty-d3-1000iu-100', title: "Nature's Bounty Vitamin D3 1000 IU, 100 Softgels", titleAr: 'نيتشرز باونتي فيتامين د3 1000 وحدة، 100 كبسولة طرية',
    description: 'Daily vitamin D3 to support healthy bones, teeth, muscles and immune function.',
    descriptionAr: 'فيتامين د3 يومي لدعم صحة العظام والأسنان والعضلات ووظائف المناعة.',
    category: 'vit', sub: 1, brand: 'naturesbounty', price: 49, sale: 42, quantity: 160, sold: 930, rating: 4.8, featured: true, pack: 'bottle', label: 'Vitamin D3', strength: '1000 IU',
    benefits: [['Supports bone health', 'يدعم صحة العظام'], ['Supports immune function', 'يدعم وظائف المناعة'], ['Easy-to-swallow softgels', 'كبسولات طرية سهلة البلع']],
    ingredients: [['Vitamin D3 (cholecalciferol) 25 mcg', 'فيتامين د3 (كوليكالسيفيرول) 25 مكغ']],
    directions: ['Adults: 1 softgel daily with a meal.', 'البالغون: كبسولة واحدة يومياً مع الطعام.'],
    sizes: [['100 softgels', '100 كبسولة']]
  },
  {
    slug: 'seven-seas-omega-3-60', title: 'Seven Seas Simply Timeless Omega-3 Fish Oil Plus Cod Liver Oil, 60 Capsules', titleAr: 'سفن سيز سيمبلي تايملس أوميغا 3 زيت السمك مع زيت كبد الحوت، 60 كبسولة',
    description: 'Omega-3 fish oil rich in EPA and DHA to support heart, brain and eye health.',
    descriptionAr: 'زيت سمك أوميغا 3 غني بأحماض EPA وDHA لدعم صحة القلب والدماغ والعينين.',
    category: 'vit', sub: 2, brand: 'sevenseas', price: 58, quantity: 110, sold: 640, rating: 4.7, pack: 'bottle', label: 'Omega-3', strength: '60 capsules',
    benefits: [['Supports heart function', 'يدعم وظائف القلب'], ['DHA for brain and vision', 'DHA للدماغ والنظر'], ['One capsule a day', 'كبسولة واحدة يومياً']],
    ingredients: [['Fish oil', 'زيت السمك'], ['Cod liver oil', 'زيت كبد الحوت'], ['EPA & DHA omega-3', 'أوميغا 3 (EPA وDHA)'], ['Vitamin D', 'فيتامين د']],
    directions: ['Adults: 1 capsule daily with food.', 'البالغون: كبسولة واحدة يومياً مع الطعام.'],
    sizes: [['60 capsules', '60 كبسولة']]
  },
  {
    slug: 'caltrate-600-d3-60', title: 'Caltrate 600 + D3, 60 Tablets', titleAr: 'كالتريت 600 + د3، 60 قرصاً',
    description: 'Calcium with vitamin D3 to help maintain strong bones and support calcium absorption.',
    descriptionAr: 'كالسيوم مع فيتامين د3 للمساعدة في الحفاظ على قوة العظام ودعم امتصاص الكالسيوم.',
    category: 'vit', sub: 3, brand: 'caltrate', price: 52, quantity: 100, sold: 480, rating: 4.7, pack: 'bottle', label: 'Calcium + D3', strength: '600 mg',
    benefits: [['Maintains strong bones', 'يحافظ على قوة العظام'], ['Vitamin D3 aids absorption', 'فيتامين د3 يعزز الامتصاص'], ['Suitable for adults', 'مناسب للبالغين']],
    ingredients: [['Calcium 600 mg (as carbonate)', 'كالسيوم 600 ملغ (كربونات)'], ['Vitamin D3', 'فيتامين د3']],
    directions: ['Adults: 1 tablet once or twice daily with meals.', 'البالغون: قرص واحد مرة أو مرتين يومياً مع الوجبات.'],
    sizes: [['60 tablets', '60 قرصاً']]
  },
  {
    slug: 'feroglobin-iron-30', title: 'Vitabiotics Feroglobin Iron, 30 Capsules', titleAr: 'فيتابيوتكس فيروغلوبين حديد، 30 كبسولة',
    description: 'Gentle iron formula with folic acid, vitamin B12 and zinc to help reduce tiredness and fatigue.',
    descriptionAr: 'تركيبة حديد لطيفة مع حمض الفوليك وفيتامين ب12 والزنك للمساعدة في تقليل التعب والإرهاق.',
    category: 'vit', sub: 0, brand: 'vitabiotics', price: 45, quantity: 80, sold: 350, rating: 4.6, pack: 'box', label: 'Iron Complex', strength: '30 capsules',
    benefits: [['Gentle on the stomach', 'لطيف على المعدة'], ['Reduces tiredness', 'يقلل التعب'], ['Supports healthy blood', 'يدعم صحة الدم']],
    ingredients: [['Iron', 'حديد'], ['Folic acid', 'حمض الفوليك'], ['Vitamin B12', 'فيتامين ب12'], ['Zinc', 'زنك']],
    directions: ['Adults: 1 capsule daily with a meal. Keep out of reach of children.', 'البالغون: كبسولة واحدة يومياً مع الطعام. يحفظ بعيداً عن متناول الأطفال.'],
    sizes: [['30 capsules', '30 كبسولة']]
  },
  {
    slug: 'wellkid-soft-jellies-30', title: 'Vitabiotics Wellkid Multi-Vitamin Soft Jellies, 30', titleAr: 'فيتابيوتكس ويلكيد فيتامينات متعددة جيلي، 30 قطعة',
    description: 'Orange-flavoured soft jelly pastilles with multi-vitamins, flaxseed oil and vitamin D for children aged 4 to 12.',
    descriptionAr: 'حلوى جيلي طرية بنكهة البرتقال تحتوي على فيتامينات متعددة وزيت بذور الكتان وفيتامين د للأطفال من 4 إلى 12 سنة.',
    category: 'vit', sub: 0, brand: 'vitabiotics', price: 52, sale: 45, quantity: 120, sold: 560, rating: 4.7, pack: 'jar', label: 'Kids Multivitamin', strength: '30 jellies',
    benefits: [['Kids love the taste', 'طعم يحبه الأطفال'], ['Supports growth and immunity', 'يدعم النمو والمناعة'], ['With vitamin D', 'مع فيتامين د']],
    ingredients: [['Vitamins A, C, D, E', 'فيتامينات أ، سي، د، هـ'], ['B-vitamins', 'فيتامينات ب']],
    directions: ['Children 4–12: 1 jelly daily, chewed.', 'الأطفال 4–12 سنة: قطعة واحدة يومياً تمضغ.'],
    sizes: [['30 jellies', '30 قطعة']]
  },

  /* --------------------------------- Skin Care ------------------------------ */
  {
    slug: 'cerave-foaming-cleanser-236ml', title: 'CeraVe Foaming Cleanser, 236ml', titleAr: 'سيرافي غسول رغوي، 236 مل',
    description: 'Foaming gel cleanser for normal to oily skin that removes oil and dirt while protecting the skin barrier.',
    descriptionAr: 'غسول جل رغوي للبشرة العادية إلى الدهنية يزيل الدهون والأوساخ مع حماية حاجز البشرة.',
    category: 'skin', sub: 0, brand: 'cerave', price: 70, quantity: 140, sold: 1200, rating: 4.8, featured: true, pack: 'pump', label: 'Foaming Cleanser', strength: '236 ml',
    benefits: [['Removes excess oil', 'يزيل الدهون الزائدة'], ['Non-comedogenic', 'لا يسد المسام'], ['Developed with dermatologists', 'مطور مع أطباء الجلدية']],
    ingredients: [['Ceramides 1, 3, 6-II', 'سيراميدات 1، 3، 6-II'], ['Niacinamide', 'نياسيناميد'], ['Hyaluronic acid', 'حمض الهيالورونيك']],
    directions: ['Massage onto wet skin morning and evening, then rinse.', 'دلّكه على البشرة المبللة صباحاً ومساءً ثم اشطفه.'],
    sizes: [['236 ml', '236 مل'], ['473 ml', '473 مل']]
  },
  {
    slug: 'cerave-sa-smoothing-cleanser-236ml', title: 'CeraVe SA Smoothing Cleanser, 236ml', titleAr: 'سيرافي غسول SA المنعم، 236 مل',
    description: 'Salicylic acid cleanser that exfoliates, smooths rough, bumpy skin and helps unclog pores.',
    descriptionAr: 'غسول بحمض الساليسيليك يقشر البشرة وينعم الملمس الخشن ويساعد على تنظيف المسام.',
    category: 'skin', sub: 0, brand: 'cerave', price: 75, quantity: 100, sold: 720, rating: 4.7, pack: 'pump', label: 'SA Cleanser', strength: '236 ml',
    benefits: [['Gently exfoliates', 'يقشر بلطف'], ['Smooths rough texture', 'ينعم الملمس الخشن'], ['Helps unclog pores', 'يساعد على تنظيف المسام']],
    ingredients: [['Salicylic acid', 'حمض الساليسيليك'], ['Ceramides', 'سيراميدات'], ['Hyaluronic acid', 'حمض الهيالورونيك']],
    directions: ['Use once or twice daily on wet skin, then rinse. Use sunscreen during the day.', 'يستخدم مرة أو مرتين يومياً على بشرة مبللة ثم يشطف. استخدم واقي الشمس نهاراً.'],
    sizes: [['236 ml', '236 مل']]
  },
  {
    slug: 'effaclar-duo-m-treatment-40ml', title: 'La Roche-Posay Effaclar Duo+M, 40ml', titleAr: 'لاروش بوزيه إيفاكلار ديو+M، 40 مل',
    description: 'Anti-blemish care for oily, acne-prone skin that targets spots and marks and helps prevent their return.',
    descriptionAr: 'عناية مضادة للشوائب للبشرة الدهنية المعرضة لحب الشباب تستهدف الحبوب وآثارها وتساعد على منع عودتها.',
    category: 'skin', sub: 0, brand: 'lrp', price: 95, sale: 82, quantity: 90, sold: 830, rating: 4.7, featured: true, pack: 'tube', label: 'Anti-Blemish Care', strength: '40 ml',
    benefits: [['Targets blemishes', 'يستهدف الشوائب'], ['Fades post-acne marks', 'يخفف آثار الحبوب'], ['Non-comedogenic', 'لا يسد المسام']],
    ingredients: [['Niacinamide', 'نياسيناميد'], ['Salicylic acid', 'حمض الساليسيليك'], ['LHA', 'LHA'], ['Zinc', 'زنك']],
    directions: ['Apply morning and/or evening to clean skin, on the whole face.', 'يوضع صباحاً و/أو مساءً على بشرة نظيفة على كامل الوجه.'],
    sizes: [['40 ml', '40 مل']]
  },
  {
    slug: 'the-ordinary-niacinamide-serum-30ml', title: 'The Ordinary Niacinamide 10% + Zinc 1%, 30ml', titleAr: 'ذا أورديناري نياسيناميد 10% + زنك 1%، 30 مل',
    description: 'Water-based serum that reduces the look of blemishes and congestion and balances visible oil.',
    descriptionAr: 'سيروم مائي يقلل ظهور الشوائب والاحتقان ويوازن الدهون الظاهرة.',
    category: 'skin', sub: 1, brand: 'ordinary', price: 45, quantity: 150, sold: 1400, rating: 4.6, pack: 'dropper', label: 'Niacinamide Serum', strength: '10% + Zinc',
    benefits: [['Reduces the look of blemishes', 'يقلل ظهور الشوائب'], ['Balances oil', 'يوازن الدهون'], ['Refines skin texture', 'يحسن ملمس البشرة']],
    ingredients: [['Niacinamide 10%', 'نياسيناميد 10%'], ['Zinc PCA 1%', 'زنك PCA 1%']],
    directions: ['Apply a few drops to the face morning and evening before creams.', 'ضع بضع قطرات على الوجه صباحاً ومساءً قبل الكريمات.'],
    sizes: [['30 ml', '30 مل']]
  },
  {
    slug: 'cerave-moisturising-cream-340g', title: 'CeraVe Moisturising Cream, 340g', titleAr: 'سيرافي كريم مرطب، 340 غ',
    description: 'Rich, non-greasy cream for dry to very dry skin with three essential ceramides for 24-hour hydration.',
    descriptionAr: 'كريم غني وغير دهني للبشرة الجافة إلى الجافة جداً بثلاثة سيراميدات أساسية لترطيب 24 ساعة.',
    category: 'skin', sub: 2, brand: 'cerave', price: 95, quantity: 80, sold: 690, rating: 4.9, pack: 'jar', label: 'Moisturising Cream', strength: '340 g',
    benefits: [['24-hour hydration', 'ترطيب لمدة 24 ساعة'], ['Restores the skin barrier', 'يرمم حاجز البشرة'], ['Fragrance-free', 'خالٍ من العطور']],
    ingredients: [['Ceramides 1, 3, 6-II', 'سيراميدات 1، 3، 6-II'], ['Hyaluronic acid', 'حمض الهيالورونيك']],
    directions: ['Apply liberally to face and body as often as needed.', 'يوضع بكمية وافرة على الوجه والجسم كلما دعت الحاجة.'],
    sizes: [['340 g', '340 غ']]
  },
  {
    slug: 'bioderma-sensibio-h2o-cleanser-250ml', title: 'Bioderma Sensibio H2O Micellar Water, 250ml', titleAr: 'بيوديرما سينسيبيو H2O ماء ميسيلار، 250 مل',
    description: 'Gentle micellar water that cleanses and removes make-up from sensitive skin — no rinsing needed.',
    descriptionAr: 'ماء ميسيلار لطيف ينظف البشرة الحساسة ويزيل المكياج دون الحاجة إلى الشطف.',
    category: 'skin', sub: 0, brand: 'bioderma', price: 70, sale: 59, quantity: 120, sold: 980, rating: 4.8, pack: 'bottle', label: 'Micellar Water', strength: '250 ml',
    benefits: [['Cleanses and removes make-up', 'ينظف ويزيل المكياج'], ['For sensitive skin', 'للبشرة الحساسة'], ['No rinse needed', 'لا يحتاج إلى شطف']],
    ingredients: [['Micelles', 'جزيئات الميسيل'], ['Cucumber extract', 'مستخلص الخيار']],
    directions: ['Apply with a cotton pad to face and eyes morning and evening.', 'يوضع بقطنة على الوجه والعينين صباحاً ومساءً.'],
    sizes: [['250 ml', '250 مل'], ['500 ml', '500 مل']]
  },
  {
    slug: 'cicaplast-baume-b5-repair-40ml', title: 'La Roche-Posay Cicaplast Baume B5+, 40ml', titleAr: 'لاروش بوزيه سيكابلاست بلسم B5+، 40 مل',
    description: 'Soothing repair balm for dry, irritated or cracked skin on the face and body — for adults, children and babies.',
    descriptionAr: 'بلسم مهدئ ومرمم للبشرة الجافة أو المتهيجة أو المتشققة في الوجه والجسم، للكبار والأطفال والرضع.',
    category: 'skin', sub: 2, brand: 'lrp', price: 70, quantity: 110, sold: 760, rating: 4.8, pack: 'tube', label: 'Repair Balm', strength: '40 ml',
    benefits: [['Soothes irritation', 'يهدئ التهيج'], ['Repairs the skin barrier', 'يرمم حاجز البشرة'], ['For the whole family', 'لجميع أفراد العائلة']],
    ingredients: [['Panthenol (vitamin B5) 5%', 'بانثينول (فيتامين ب5) 5%'], ['Madecassoside', 'ماديكاسوسيد'], ['Shea butter', 'زبدة الشيا']],
    directions: ['Apply twice daily to clean, dry skin.', 'يوضع مرتين يومياً على بشرة نظيفة وجافة.'],
    sizes: [['40 ml', '40 مل'], ['100 ml', '100 مل']]
  },

  /* ------------------------------ Sun Protection ---------------------------- */
  {
    slug: 'anthelios-uvmune-400-fluid-spf50-50ml', title: 'La Roche-Posay Anthelios UVMune 400 Invisible Fluid SPF50+, 50ml', titleAr: 'لاروش بوزيه أنثيليوس UVMune 400 سائل غير مرئي SPF50+، 50 مل',
    description: 'Ultra-light, invisible face sunscreen with very high UVA/UVB protection, including long UVA rays.',
    descriptionAr: 'واقي شمس للوجه خفيف جداً وغير مرئي بحماية عالية جداً من UVA/UVB بما في ذلك أشعة UVA الطويلة.',
    category: 'sun', sub: 0, brand: 'lrp', price: 120, sale: 99, quantity: 120, sold: 1150, rating: 4.9, featured: true, pack: 'tube', label: 'Face Sun Fluid', strength: 'SPF 50+',
    benefits: [['Very high protection', 'حماية عالية جداً'], ['Invisible, non-greasy finish', 'لمسة غير مرئية وغير دهنية'], ['Suitable for sensitive skin', 'مناسب للبشرة الحساسة']],
    ingredients: [['Mexoryl 400 filter', 'فلتر ميكسوريل 400'], ['La Roche-Posay thermal spring water', 'مياه لاروش بوزيه الحرارية']],
    directions: ['Apply generously before sun exposure. Reapply often, especially after swimming or sweating.', 'يوضع بكمية وافرة قبل التعرض للشمس. أعد وضعه باستمرار خاصة بعد السباحة أو التعرق.'],
    sizes: [['50 ml', '50 مل']]
  },
  {
    slug: 'bioderma-photoderm-spray-spf50-200ml', title: 'Bioderma Photoderm Spray SPF50+, 200ml', titleAr: 'بيوديرما فوتوديرم بخاخ SPF50+، 200 مل',
    description: 'Very high protection sun spray for face and body, ideal for sensitive skin and family use.',
    descriptionAr: 'بخاخ واقٍ من الشمس بحماية عالية جداً للوجه والجسم، مثالي للبشرة الحساسة وللعائلة.',
    category: 'sun', sub: 1, brand: 'bioderma', price: 105, quantity: 70, sold: 410, rating: 4.7, pack: 'spray', label: 'Body Sun Spray', strength: 'SPF 50+',
    benefits: [['Very high protection', 'حماية عالية جداً'], ['Water-resistant', 'مقاوم للماء'], ['Light, non-sticky texture', 'قوام خفيف غير لزج']],
    ingredients: [['Broad-spectrum UV filters', 'فلاتر واسعة الطيف'], ['Cellular Bioprotection complex', 'مركب الحماية الخلوية']],
    directions: ['Spray generously before sun exposure and reapply every 2 hours.', 'يرش بكمية وافرة قبل التعرض للشمس ويعاد كل ساعتين.'],
    sizes: [['200 ml', '200 مل']]
  },
  {
    slug: 'avene-children-spray-spf50-200ml', title: 'Avène Very High Protection Spray for Children SPF50+, 200ml', titleAr: 'أفين بخاخ حماية عالية جداً للأطفال SPF50+، 200 مل',
    description: "Very water-resistant sun spray designed for children's sensitive skin, with Avène thermal spring water.",
    descriptionAr: 'بخاخ واقٍ من الشمس مقاوم جداً للماء مصمم لبشرة الأطفال الحساسة، مع مياه أفين الحرارية.',
    category: 'sun', sub: 1, brand: 'avene', price: 115, sale: 98, quantity: 60, sold: 330, rating: 4.8, pack: 'spray', label: 'Kids Sun Spray', strength: 'SPF 50+',
    benefits: [['For sensitive children\'s skin', 'لبشرة الأطفال الحساسة'], ['Very water-resistant', 'مقاوم جداً للماء'], ['Easy to apply', 'سهل الاستخدام']],
    ingredients: [['UV filters', 'فلاتر الأشعة'], ['Avène thermal spring water', 'مياه أفين الحرارية']],
    directions: ['Apply before sun exposure and reapply often. Keep babies under 6 months out of direct sun.', 'يوضع قبل التعرض للشمس ويكرر باستمرار. يجب إبقاء الرضع دون 6 أشهر بعيداً عن الشمس المباشرة.'],
    sizes: [['200 ml', '200 مل']]
  },
  {
    slug: 'nivea-after-sun-lotion-200ml', title: 'Nivea Sun After Sun Soothing Lotion, 200ml', titleAr: 'نيفيا صن لوشن مهدئ لما بعد الشمس، 200 مل',
    description: 'Light lotion with aloe vera that cools, soothes and hydrates skin after sun exposure.',
    descriptionAr: 'لوشن خفيف بالصبار يبرد ويهدئ ويرطب البشرة بعد التعرض للشمس.',
    category: 'sun', sub: 2, brand: 'nivea', price: 40, quantity: 90, sold: 380, rating: 4.6, pack: 'pump', label: 'After Sun Lotion', strength: '200 ml',
    benefits: [['Cools and soothes', 'يبرد ويهدئ'], ['Hydrates sun-exposed skin', 'يرطب البشرة بعد الشمس'], ['Absorbs quickly', 'سريع الامتصاص']],
    ingredients: [['Aloe vera', 'الصبار'], ['Glycerin', 'جليسرين']],
    directions: ['Apply generously after sun exposure.', 'يوضع بكمية وافرة بعد التعرض للشمس.'],
    sizes: [['200 ml', '200 مل']]
  },

  /* ------------------------------- Mother & Baby ---------------------------- */
  {
    slug: 'sudocrem-healing-cream-125g', title: 'Sudocrem Antiseptic Healing Cream, 125g', titleAr: 'سودوكريم كريم مطهر وملطف، 125 غ',
    description: 'The classic soothing cream for nappy rash, minor cuts, grazes and eczema.',
    descriptionAr: 'الكريم الكلاسيكي المهدئ لالتهاب الحفاض والجروح والخدوش البسيطة والإكزيما.',
    category: 'baby', sub: 0, brand: 'sudocrem', price: 30, quantity: 160, sold: 1050, rating: 4.9, featured: true, pack: 'jar', label: 'Nappy Cream', strength: '125 g',
    benefits: [['Soothes nappy rash', 'يهدئ التهاب الحفاض'], ['Forms a protective barrier', 'يكوّن طبقة حماية'], ['Gentle antiseptic', 'مطهر لطيف']],
    ingredients: [['Zinc oxide 15.25%', 'أكسيد الزنك 15.25%'], ['Lanolin', 'لانولين'], ['Benzyl benzoate', 'بنزوات البنزيل']],
    directions: ['Apply a thin layer at each nappy change to clean, dry skin.', 'ضع طبقة رقيقة عند كل تغيير للحفاض على جلد نظيف وجاف.'],
    sizes: [['125 g', '125 غ'], ['250 g', '250 غ']]
  },
  {
    slug: 'bepanthen-nappy-care-ointment-30g', title: 'Bepanthen Nappy Care Ointment, 30g', titleAr: 'بيبانثين مرهم العناية بالحفاض، 30 غ',
    description: "Protects baby's delicate skin from nappy rash at every change and supports natural skin healing.",
    descriptionAr: 'يحمي بشرة الطفل الرقيقة من التهاب الحفاض عند كل تغيير ويدعم الالتئام الطبيعي للبشرة.',
    category: 'baby', sub: 0, brand: 'bepanthen', price: 25, quantity: 150, sold: 870, rating: 4.8, pack: 'tube', label: 'Nappy Ointment', strength: '30 g',
    benefits: [['Protects at every change', 'يحمي عند كل تغيير'], ['Free from fragrance and preservatives', 'خالٍ من العطور والمواد الحافظة'], ['Suitable from birth', 'مناسب منذ الولادة']],
    ingredients: [['Dexpanthenol 5%', 'ديكسبانثينول 5%'], ['Lanolin', 'لانولين']],
    directions: ['Apply at every nappy change.', 'يوضع عند كل تغيير للحفاض.'],
    sizes: [['30 g', '30 غ'], ['100 g', '100 غ']]
  },
  {
    slug: 'mustela-gentle-cleansing-gel-500ml', title: 'Mustela Gentle Cleansing Gel, 500ml', titleAr: 'موستيلا جل التنظيف اللطيف، 500 مل',
    description: 'Tear-free hair and body wash for babies, enriched with natural avocado to protect delicate skin.',
    descriptionAr: 'غسول للشعر والجسم للأطفال لا يسبب الدموع، غني بالأفوكادو الطبيعي لحماية البشرة الرقيقة.',
    category: 'baby', sub: 1, brand: 'mustela', price: 75, sale: 64, quantity: 90, sold: 420, rating: 4.7, pack: 'pump', label: 'Baby Wash', strength: '500 ml',
    benefits: [['Tear-free formula', 'تركيبة لا تسبب الدموع'], ['For hair and body', 'للشعر والجسم'], ['Suitable from birth', 'مناسب منذ الولادة']],
    ingredients: [['Avocado perseose', 'بيرسيوز الأفوكادو'], ['Plant-based cleansers', 'منظفات نباتية']],
    directions: ['Lather on wet skin and hair, then rinse.', 'يدلك على الجلد والشعر المبلل ثم يشطف.'],
    sizes: [['500 ml', '500 مل']]
  },
  {
    slug: 'waterwipes-sensitive-60', title: 'WaterWipes Sensitive Baby Wipes, 60 Wipes', titleAr: 'ووتر وايبس مناديل مبللة للأطفال، 60 منديلاً',
    description: 'Baby wipes made with 99.9% water and a drop of fruit extract — gentle enough for newborn skin.',
    descriptionAr: 'مناديل أطفال مصنوعة من 99.9% ماء وقطرة من مستخلص الفاكهة، لطيفة بما يكفي لبشرة حديثي الولادة.',
    category: 'baby', sub: 1, brand: 'waterwipes', price: 20, quantity: 250, sold: 1480, rating: 4.8, pack: 'sachet', label: 'Baby Wipes', strength: '60 wipes',
    benefits: [['99.9% water', '99.9% ماء'], ['Suitable from birth', 'مناسبة منذ الولادة'], ['Fragrance-free', 'خالية من العطور']],
    ingredients: [['Purified water 99.9%', 'ماء منقى 99.9%'], ['Fruit extract', 'مستخلص الفاكهة']],
    directions: ['Wipe gently. Reseal the pack after use.', 'امسح بلطف. أعد إغلاق العبوة بعد الاستخدام.'],
    sizes: [['60 wipes', '60 منديلاً']]
  },
  {
    slug: 'lansinoh-hpa-lanolin-40ml', title: 'Lansinoh HPA Lanolin Nipple Cream, 40ml', titleAr: 'لانسينوه كريم اللانولين للحلمات، 40 مل',
    description: '100% natural lanolin that soothes and protects sore, cracked nipples — no need to remove before breastfeeding.',
    descriptionAr: 'لانولين طبيعي 100% يهدئ ويحمي الحلمات المتألمة والمتشققة، ولا حاجة لإزالته قبل الرضاعة.',
    category: 'baby', sub: 2, brand: 'lansinoh', price: 50, quantity: 70, sold: 300, rating: 4.8, pack: 'tube', label: 'Lanolin Cream', strength: '40 ml',
    benefits: [['Soothes sore nipples', 'يهدئ الحلمات المتألمة'], ['Safe for baby', 'آمن للطفل'], ['No taste or smell', 'بدون طعم أو رائحة']],
    ingredients: [['100% HPA lanolin', 'لانولين HPA بنسبة 100%']],
    directions: ['Apply a small amount after each feed.', 'ضعي كمية صغيرة بعد كل رضعة.'],
    sizes: [['40 ml', '40 مل']]
  },
  {
    slug: 'sterimar-baby-nasal-100ml', title: 'Stérimar Baby Nasal Hygiene, 100ml', titleAr: 'ستيريمار بيبي لتنظيف أنف الأطفال، 100 مل',
    description: 'Gentle sea-water spray with a baby-safe nozzle to clean little noses and help babies breathe, feed and sleep.',
    descriptionAr: 'بخاخ ماء بحر لطيف بفوهة آمنة للأطفال ينظف أنف الطفل ويساعده على التنفس والرضاعة والنوم.',
    category: 'baby', sub: 0, brand: 'sterimar', price: 50, quantity: 80, sold: 360, rating: 4.7, pack: 'spray', label: 'Baby Nasal Spray', strength: '100 ml',
    benefits: [['Drug-free', 'خالٍ من الأدوية'], ['Baby-safe nozzle', 'فوهة آمنة للأطفال'], ['From 3 months', 'من عمر 3 أشهر']],
    ingredients: [['Purified sea water', 'ماء بحر منقى']],
    directions: ['1 spray in each nostril up to 6 times daily, with the baby lying on its side.', 'بخة في كل فتحة أنف حتى 6 مرات يومياً مع وضع الطفل على جانبه.'],
    sizes: [['100 ml', '100 مل']]
  },

  /* ------------------------------- Personal Care ---------------------------- */
  {
    slug: 'sensodyne-repair-protect-75ml', title: 'Sensodyne Repair & Protect Toothpaste, 75ml', titleAr: 'سنسوداين ريبير آند بروتكت معجون أسنان، 75 مل',
    description: 'Toothpaste for sensitive teeth that builds a protective layer over sensitive areas, with fluoride for cavity protection.',
    descriptionAr: 'معجون أسنان للأسنان الحساسة يكوّن طبقة حماية فوق المناطق الحساسة، مع الفلورايد للحماية من التسوس.',
    category: 'personal', sub: 0, brand: 'sensodyne', price: 20, quantity: 260, sold: 1350, rating: 4.7, pack: 'tube', label: 'Sensitive Toothpaste', strength: '75 ml',
    benefits: [['Relieves sensitivity', 'يخفف الحساسية'], ['Repairs sensitive areas', 'يرمم المناطق الحساسة'], ['Cavity protection', 'حماية من التسوس']],
    ingredients: [['Calcium sodium phosphosilicate (NovaMin)', 'فوسفوسيليكات الكالسيوم والصوديوم (نوفامين)'], ['Sodium fluoride', 'فلوريد الصوديوم']],
    directions: ['Brush twice daily.', 'نظّف أسنانك مرتين يومياً.'],
    sizes: [['75 ml', '75 مل']]
  },
  {
    slug: 'listerine-cool-mint-500ml', title: 'Listerine Cool Mint Mouthwash, 500ml', titleAr: 'ليسترين كول منت غسول فم، 500 مل',
    description: 'Antiseptic mouthwash with essential oils that kills germs for fresher breath and healthier gums.',
    descriptionAr: 'غسول فم مطهر بالزيوت العطرية يقضي على الجراثيم لنفس أكثر انتعاشاً ولثة أكثر صحة.',
    category: 'personal', sub: 0, brand: 'listerine', price: 22, quantity: 170, sold: 760, rating: 4.6, pack: 'syrup', label: 'Mouthwash', strength: '500 ml',
    benefits: [['Kills germs', 'يقضي على الجراثيم'], ['Fresh breath', 'نفس منعش'], ['Helps fight plaque', 'يساعد على مكافحة الجير']],
    ingredients: [['Eucalyptol', 'أوكاليبتول'], ['Menthol', 'منثول'], ['Thymol', 'ثيمول'], ['Methyl salicylate', 'ساليسيلات الميثيل']],
    directions: ['Rinse with 20 ml for 30 seconds twice daily. Do not swallow. Not for children under 12.', 'تمضمض بـ 20 مل لمدة 30 ثانية مرتين يومياً. لا تبتلعه. لا يستخدم للأطفال دون 12 سنة.'],
    sizes: [['500 ml', '500 مل']]
  },
  {
    slug: 'vichy-dercos-energising-shampoo-200ml', title: 'Vichy Dercos Energising Shampoo, 200ml', titleAr: 'فيشي ديركوس شامبو منشط، 200 مل',
    description: 'Fortifying shampoo with aminexil for hair loss, leaving hair stronger and more resistant.',
    descriptionAr: 'شامبو مقوٍّ بالأمينكسيل لتساقط الشعر يترك الشعر أقوى وأكثر مقاومة.',
    category: 'personal', sub: 1, brand: 'vichy', price: 85, sale: 72, quantity: 70, sold: 390, rating: 4.5, pack: 'pump', label: 'Hair Loss Shampoo', strength: '200 ml',
    benefits: [['Helps reduce hair fall', 'يساعد على تقليل تساقط الشعر'], ['Strengthens hair', 'يقوي الشعر'], ['Paraben-free', 'خالٍ من البارابين']],
    ingredients: [['Aminexil', 'أمينكسيل'], ['Vitamins B3, B5, B6', 'فيتامينات ب3، ب5، ب6']],
    directions: ['Apply to wet hair, massage, leave for 1–2 minutes and rinse.', 'يوضع على الشعر المبلل ويدلك ويترك 1–2 دقيقة ثم يشطف.'],
    sizes: [['200 ml', '200 مل']]
  },
  {
    slug: 'dettol-hand-sanitizer-200ml', title: 'Dettol Instant Hand Sanitizer, 200ml', titleAr: 'ديتول معقم اليدين الفوري، 200 مل',
    description: 'Alcohol-based hand sanitizer that kills 99.9% of germs without water.',
    descriptionAr: 'معقم يدين كحولي يقضي على 99.9% من الجراثيم بدون ماء.',
    category: 'personal', sub: 2, brand: 'dettol', price: 15, quantity: 300, sold: 1600, rating: 4.6, pack: 'pump', label: 'Hand Sanitizer', strength: '200 ml',
    benefits: [['Kills 99.9% of germs', 'يقضي على 99.9% من الجراثيم'], ['No water needed', 'لا يحتاج إلى ماء'], ['Quick drying', 'سريع الجفاف']],
    ingredients: [['Alcohol', 'كحول'], ['Glycerin', 'جليسرين']],
    directions: ['Rub a small amount over hands until dry. Flammable.', 'افرك كمية صغيرة على اليدين حتى تجف. قابل للاشتعال.'],
    sizes: [['200 ml', '200 مل']]
  },
  {
    slug: 'carmex-classic-lip-balm-jar', title: 'Carmex Classic Lip Balm Jar, 7.5g', titleAr: 'كارمكس مرطب الشفاه الكلاسيكي، 7.5 غ',
    description: 'Medicated lip balm that soothes and heals dry, chapped lips.',
    descriptionAr: 'مرطب شفاه علاجي يهدئ ويعالج الشفاه الجافة والمتشققة.',
    category: 'personal', sub: 2, brand: 'carmex', price: 12, quantity: 220, sold: 900, rating: 4.6, pack: 'jar', label: 'Lip Balm', strength: '7.5 g',
    benefits: [['Heals chapped lips', 'يعالج تشقق الشفاه'], ['Cooling sensation', 'إحساس بالبرودة'], ['Long-lasting moisture', 'ترطيب يدوم طويلاً']],
    ingredients: [['Camphor', 'كافور'], ['Menthol', 'منثول'], ['Petrolatum', 'فازلين']],
    directions: ['Apply to lips as needed.', 'يوضع على الشفاه عند الحاجة.'],
    sizes: [['7.5 g', '7.5 غ']]
  },

  /* ------------------------------ Medical Devices --------------------------- */
  {
    slug: 'omron-m3-comfort-bp-monitor', title: 'Omron M3 Comfort Upper Arm Blood Pressure Monitor', titleAr: 'أومرون M3 كومفورت جهاز قياس ضغط الدم من أعلى الذراع',
    description: 'Clinically validated monitor with an easy-wrap cuff, irregular heartbeat detection and memory for two users.',
    descriptionAr: 'جهاز معتمد سريرياً بكُم سهل اللف وكشف عدم انتظام ضربات القلب وذاكرة لمستخدمَين.',
    category: 'devices', sub: 0, brand: 'omron', price: 270, sale: 239, quantity: 40, sold: 310, rating: 4.8, featured: true, pack: 'device', label: 'BP Monitor', strength: 'Upper arm',
    benefits: [['Clinically validated', 'معتمد سريرياً'], ['Easy-wrap cuff 22–42 cm', 'كُم سهل اللف 22–42 سم'], ['Irregular heartbeat detection', 'كشف عدم انتظام ضربات القلب']],
    ingredients: [['Monitor, cuff, 4 AA batteries, manual', 'الجهاز، الكُم، 4 بطاريات AA، دليل الاستخدام']],
    directions: ['Rest 5 minutes, sit upright, wrap the cuff at heart level and press Start.', 'استرح 5 دقائق واجلس مستقيماً ولف الكُم بمستوى القلب واضغط زر البدء.'],
    sizes: [['1 device', 'جهاز واحد']]
  },
  {
    slug: 'braun-thermoscan-7-ear-thermometer', title: 'Braun ThermoScan 7 Ear Thermometer (IRT6520)', titleAr: 'براون ثيرموسكان 7 ميزان حرارة للأذن (IRT6520)',
    description: 'Professional-accuracy ear thermometer with Age Precision technology and a pre-warmed tip for consistent readings.',
    descriptionAr: 'ميزان حرارة للأذن بدقة احترافية مع تقنية Age Precision ورأس مُدفأ مسبقاً لقراءات ثابتة.',
    category: 'devices', sub: 1, brand: 'braun', price: 260, sale: 229, quantity: 35, sold: 260, rating: 4.8, pack: 'device', label: 'Ear Thermometer', strength: '1 sec',
    benefits: [['Reading in seconds', 'قراءة خلال ثوانٍ'], ['Age-adjusted fever guide', 'دليل حرارة حسب العمر'], ['Hygienic lens filters', 'فلاتر عدسة صحية']],
    ingredients: [['Thermometer, lens filters, batteries, case', 'ميزان الحرارة، فلاتر العدسة، بطاريات، حقيبة']],
    directions: ['Attach a new lens filter, place gently in the ear and press the button.', 'ركّب فلتر عدسة جديداً وضع الجهاز بلطف في الأذن واضغط الزر.'],
    sizes: [['1 device', 'جهاز واحد']]
  },
  {
    slug: 'omron-eco-temp-basic-thermometer', title: 'Omron Eco Temp Basic Digital Thermometer', titleAr: 'أومرون إيكو تيمب ميزان حرارة رقمي',
    description: 'Simple, reliable digital thermometer for oral, underarm or rectal use with a fever beep.',
    descriptionAr: 'ميزان حرارة رقمي بسيط وموثوق للاستخدام في الفم أو تحت الإبط أو الشرج مع تنبيه للحرارة.',
    category: 'devices', sub: 1, brand: 'omron', price: 30, quantity: 150, sold: 820, rating: 4.5, pack: 'device', label: 'Digital Thermometer', strength: 'Digital',
    benefits: [['Easy to read display', 'شاشة سهلة القراءة'], ['Fever alarm', 'تنبيه عند الحرارة'], ['Waterproof tip', 'رأس مقاوم للماء']],
    ingredients: [['Thermometer, battery, case', 'ميزان الحرارة، بطارية، علبة']],
    directions: ['Switch on, place the tip and wait for the beep. Clean after each use.', 'شغّل الجهاز وضع الرأس وانتظر صوت التنبيه. نظّفه بعد كل استخدام.'],
    sizes: [['1 device', 'جهاز واحد']]
  },
  {
    slug: 'beurer-po30-pulse-oximeter', title: 'Beurer PO 30 Pulse Oximeter', titleAr: 'بيورر PO 30 جهاز قياس الأكسجين',
    description: 'Fingertip oximeter that measures blood oxygen saturation (SpO2) and pulse rate on a clear colour display.',
    descriptionAr: 'جهاز يوضع على الإصبع لقياس نسبة تشبع الأكسجين في الدم (SpO2) ومعدل النبض على شاشة ملونة واضحة.',
    category: 'devices', sub: 0, brand: 'beurer', price: 130, quantity: 50, sold: 240, rating: 4.6, pack: 'device', label: 'Pulse Oximeter', strength: 'SpO2 + Pulse',
    benefits: [['SpO2 and pulse in seconds', 'الأكسجين والنبض خلال ثوانٍ'], ['Bright colour display', 'شاشة ملونة واضحة'], ['Compact and portable', 'صغير وسهل الحمل']],
    ingredients: [['Oximeter, batteries, lanyard, pouch', 'الجهاز، بطاريات، حبل تعليق، حقيبة']],
    directions: ['Insert a finger fully, keep still and read the result after a few seconds.', 'أدخل الإصبع بالكامل وابقَ ثابتاً واقرأ النتيجة بعد ثوانٍ.'],
    sizes: [['1 device', 'جهاز واحد']]
  },
  {
    slug: 'accu-chek-instant-glucose-meter', title: 'Accu-Chek Instant Blood Glucose Meter', titleAr: 'أكيو-تشيك إنستانت جهاز قياس السكر',
    description: 'Easy blood glucose meter with no coding and a simple range indicator to understand your results at a glance.',
    descriptionAr: 'جهاز سهل لقياس السكر في الدم بدون ترميز مع مؤشر نطاق بسيط لفهم النتائج بنظرة واحدة.',
    category: 'devices', sub: 0, brand: 'accuchek', price: 110, quantity: 45, sold: 220, rating: 4.7, pack: 'device', label: 'Glucose Meter', strength: 'No coding',
    benefits: [['No coding needed', 'لا يحتاج إلى ترميز'], ['Target range indicator', 'مؤشر النطاق المستهدف'], ['Bluetooth app sync', 'مزامنة مع التطبيق عبر البلوتوث']],
    ingredients: [['Meter, lancing device, lancets, case', 'الجهاز، قلم الوخز، الإبر، الحقيبة']],
    directions: ['Insert a strip, prick the side of a fingertip and apply the blood drop to the strip.', 'أدخل الشريط، ثم اوخز جانب طرف الإصبع وضع قطرة الدم على الشريط.'],
    sizes: [['Starter kit', 'طقم البداية']]
  },

  /* --------------------------------- First Aid ------------------------------ */
  {
    slug: 'hansaplast-universal-plasters-40', title: 'Hansaplast Universal Plasters, 40 Strips', titleAr: 'هانزابلاست لاصقات جروح يونيفرسال، 40 لاصقة',
    description: 'Water-resistant plasters in assorted sizes for everyday cuts and grazes.',
    descriptionAr: 'لاصقات جروح مقاومة للماء بمقاسات متنوعة للجروح والخدوش اليومية.',
    category: 'aid', sub: 0, brand: 'hansaplast', price: 15, quantity: 280, sold: 1150, rating: 4.6, pack: 'box', label: 'Plasters', strength: '40 strips',
    benefits: [['Water-resistant', 'مقاومة للماء'], ['Assorted sizes', 'مقاسات متنوعة'], ['Wound pad does not stick', 'وسادة لا تلتصق بالجرح']],
    ingredients: [['Plastic film strips', 'شرائط بلاستيكية'], ['Absorbent pad', 'وسادة ماصة']],
    directions: ['Clean and dry the wound, then apply. Change daily.', 'نظّف الجرح وجففه ثم ضع اللاصقة. غيّرها يومياً.'],
    sizes: [['40 strips', '40 لاصقة']]
  },
  {
    slug: 'dettol-antiseptic-liquid-500ml', title: 'Dettol Antiseptic Disinfectant Liquid, 500ml', titleAr: 'ديتول سائل مطهر، 500 مل',
    description: 'Trusted antiseptic liquid for first aid, cuts and grazes, and personal hygiene when diluted.',
    descriptionAr: 'سائل مطهر موثوق للإسعافات الأولية والجروح والخدوش والنظافة الشخصية بعد التخفيف.',
    category: 'aid', sub: 1, brand: 'dettol', price: 25, quantity: 180, sold: 940, rating: 4.7, pack: 'syrup', label: 'Antiseptic Liquid', strength: '500 ml',
    benefits: [['Kills germs', 'يقضي على الجراثيم'], ['For first aid and hygiene', 'للإسعافات الأولية والنظافة'], ['Multi-purpose', 'متعدد الاستخدامات']],
    ingredients: [['Chloroxylenol 4.8%', 'كلوروكسيلينول 4.8%']],
    directions: ['Always dilute before use as directed on the pack. For external use only.', 'يخفف دائماً قبل الاستخدام حسب التعليمات على العبوة. للاستعمال الخارجي فقط.'],
    sizes: [['500 ml', '500 مل']]
  },
  {
    slug: 'betadine-antiseptic-solution-125ml', title: 'Betadine Antiseptic Solution 10%, 125ml', titleAr: 'بيتادين محلول مطهر 10%، 125 مل',
    description: 'Povidone-iodine antiseptic that helps prevent infection in minor cuts, grazes and burns.',
    descriptionAr: 'مطهر بوفيدون اليود يساعد على الوقاية من الالتهاب في الجروح والخدوش والحروق البسيطة.',
    category: 'aid', sub: 1, brand: 'betadine', price: 20, quantity: 140, sold: 610, rating: 4.7, pack: 'syrup', label: 'Povidone-Iodine', strength: '10%',
    benefits: [['Broad-spectrum antiseptic', 'مطهر واسع الطيف'], ['Helps prevent infection', 'يساعد على الوقاية من الالتهاب'], ['For cuts and minor burns', 'للجروح والحروق البسيطة']],
    ingredients: [['Povidone-iodine 10%', 'بوفيدون اليود 10%']],
    directions: join(['Apply to the affected area 1–3 times daily. For external use only. Avoid if allergic to iodine.', 'يوضع على المنطقة المصابة 1–3 مرات يومياً. للاستعمال الخارجي فقط. تجنبه في حال حساسية اليود.'], PHARMACIST),
    sizes: [['125 ml', '125 مل']]
  }
];

export const BRANCHES = [
  { name: 'Apex Aora Pharmacy — Dubai Marina', nameAr: 'صيدلية أبكس أورا — دبي مارينا', city: 'Dubai', cityAr: 'دبي', address: 'Marina Walk, Tower 3, Ground Floor', addressAr: 'ممشى المارينا، البرج 3، الطابق الأرضي', phone: '+971 4 000 0001', workingHours: '24/7', location: { lat: 25.0805, lng: 55.1403 }, isMain: true },
  { name: 'Apex Aora Pharmacy — Downtown', nameAr: 'صيدلية أبكس أورا — وسط المدينة', city: 'Dubai', cityAr: 'دبي', address: 'Mohammed Bin Rashid Blvd, Building 12', addressAr: 'بوليفارد محمد بن راشد، مبنى 12', phone: '+971 4 000 0002', workingHours: '8:00 – 24:00', location: { lat: 25.1972, lng: 55.2744 } },
  { name: 'Apex Aora Pharmacy — Al Reem Island', nameAr: 'صيدلية أبكس أورا — جزيرة الريم', city: 'Abu Dhabi', cityAr: 'أبوظبي', address: 'Shams Boutik, Al Reem Island', addressAr: 'شمس بوتيك، جزيرة الريم', phone: '+971 2 000 0003', workingHours: '8:00 – 23:00', location: { lat: 24.4949, lng: 54.4066 } },
  { name: 'Apex Aora Pharmacy — Al Majaz', nameAr: 'صيدلية أبكس أورا — المجاز', city: 'Sharjah', cityAr: 'الشارقة', address: 'Corniche Street, Al Majaz 2', addressAr: 'شارع الكورنيش، المجاز 2', phone: '+971 6 000 0004', workingHours: '8:00 – 24:00', location: { lat: 25.3253, lng: 55.3837 } }
];

export const COUPONS = [
  { name: 'WELCOME10', discount: 10, days: 365 },
  { name: 'HEALTH20', discount: 20, days: 90 }
];
