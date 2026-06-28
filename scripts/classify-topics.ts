import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const EXAM_ID = 'e33338c9-740c-48c4-914b-2cca3e9c1668';

// Topic IDs
const TOPICS = {
  // building-materials
  building_materials: '880c7ee1-0204-4a42-979f-338ca32f84be',
  construction_practices: '7fbea21c-2d47-4c90-b4df-54d590919d9c',
  // environmental-engg
  water_supply: '5005286a-c8a9-4f38-a12f-46a61fd65689',
  wastewater: '309a5082-9ce4-4f4e-9d68-9a9ac706dd49',
  solid_waste: '5e4f407e-7ce5-4934-9808-c406a1df2083',
  air_noise: '7395c294-a064-4c5a-adc1-cb722bd4bd22',
  // fluid-mechanics
  fluid_mechanics: '315ecc01-24f7-4b37-a608-fd8fbb7ef30e',
  hydraulics: 'ec71764c-6040-47e0-bbc1-9777aafbeec7',
  // geotechnical-engg
  soil_mechanics: '4c395c9a-2cad-4ea6-ac3d-b0b7bd1a4dee',
  foundation_engg: '8dd2ff2a-1e16-4faf-9d4e-2144ed7bc3bd',
  engg_geology: '82ee8eac-79fd-487b-8070-753f9ce2ecae',
  // rcc-design
  rcc_structures: '1bba627d-75a7-47e9-8413-f09905572b33',
  prestressed: '385e0a26-4498-4274-ac08-fb3af47b1ad2',
  // solid-mechanics
  strength_of_materials: '4002ff85-6eee-4cd3-8c35-1d7039df2745',
  // surveying
  surveying: 'f28c858a-cf0c-482e-a112-8845927e82f4',
  // estimation-costing
  estimation_costing: '4cf00bbd-c0d6-49dd-88a5-505bae0ef9ab',
  // steel-design
  steel_structures: '63b1aa41-9022-4bff-b5b8-0aa71ec874fd',
  // structural-analysis
  theory_structures: 'f3d692c1-91a4-4a8b-acc5-2b44896f704f',
  // transportation-engg
  highway: '29d611e8-8d9c-48f0-85c3-621cccd58722',
  railway: '0606d3ae-297d-4c7b-a1af-955e7476d082',
  airport: 'ac98a87f-3b16-43cf-8ac3-8e3c2ad53ea1',
  // water-resources-engg
  hydrology: '9b40396e-3ed0-47ab-b981-52f6a8e6cdd3',
  water_resources: '466ae85d-fb09-4845-8324-5fd0d29ca1fd',
};

// Single-topic subjects: assign directly
const SINGLE_TOPIC_MAP: Record<string, string> = {
  'surveying': TOPICS.surveying,
  'estimation-costing': TOPICS.estimation_costing,
  'solid-mechanics': TOPICS.strength_of_materials,
};

// Classification rules for multi-topic subjects
function classifyQuestion(subjectSlug: string, questionText: string): string {
  const q = questionText.toLowerCase();

  switch (subjectSlug) {
    case 'building-materials': {
      // Construction Practices keywords
      const constructionKeywords = [
        'well foundation', 'well curb', 'well cap', 'cutting edge', 'steining',
        'nbc 2016', 'nbc 2005', 'far ', 'far-', 'foundation', 'exploration',
        'raft foundation', 'depth of exploration', 'width at base',
        'wall foundation', 'institutional buildings', 'group-a', 'group-b',
        'queen post truss', 'truss',
      ];
      if (constructionKeywords.some(kw => q.includes(kw))) {
        return TOPICS.construction_practices;
      }
      return TOPICS.building_materials;
    }

    case 'environmental-engg': {
      // Solid Waste Management
      const solidWasteKeywords = [
        'solid waste', 'landfill', 'composting', 'sanitary landfill',
        'municipal solid', 'waste management', 'waste disposal',
        'annual volume of landfill',
      ];
      if (solidWasteKeywords.some(kw => q.includes(kw))) {
        return TOPICS.solid_waste;
      }

      // Air & Noise Pollution
      const airNoiseKeywords = [
        'air pollut', 'air pollution', 'esp ', 'fabric filter',
        'wet scrubber', 'scrubber', 'settling', 'pan is secondary',
        'secondary pollut', 'particulate', 'gaseous pollut',
        'noise', 'db(a)',
      ];
      if (airNoiseKeywords.some(kw => q.includes(kw))) {
        return TOPICS.air_noise;
      }

      // Wastewater Engineering
      const wastewaterKeywords = [
        'sewage', 'sewer', 'bod', 'cod', 'do=', 'do ', 'dissolved oxygen',
        'wastewater', 'waste water', 'oxidation pond', 'trickling filter',
        'secondary sed', 'primary sed', 'disinfection', 'screening',
        'grit', 'cpheeo', 'peak factor', 'scouring velocity',
        'interceptor', 'house drainage', 'sewage flow',
        'biodegradable', 'per capita sewage',
      ];
      if (wastewaterKeywords.some(kw => q.includes(kw))) {
        return TOPICS.wastewater;
      }

      // Water Supply Engineering (default for environmental)
      return TOPICS.water_supply;
    }

    case 'fluid-mechanics': {
      // Hydraulics keywords (pipe flow, open channel, pumps)
      const hydraulicsKeywords = [
        'pipe', 'hgl', 'tel', 'wetted perimeter', 'economical',
        'reciprocating pump', 'suction', 'delivery valve',
        'pitot', 'velocity measurement', 'open channel',
        'venturi', 'orifice', 'notch', 'weir',
        'most economical', 'hydraulic mean depth',
        'entrance', 'exit',
      ];
      if (hydraulicsKeywords.some(kw => q.includes(kw))) {
        return TOPICS.hydraulics;
      }

      // Fluid Mechanics (default)
      return TOPICS.fluid_mechanics;
    }

    case 'geotechnical-engg': {
      // Engineering Geology
      const geologyKeywords = [
        'effervesces', 'hcl', 'calcareous', 'rock', 'geological',
        'mineral', 'igneous', 'sedimentary', 'metamorphic',
      ];
      if (geologyKeywords.some(kw => q.includes(kw))) {
        return TOPICS.engg_geology;
      }

      // Foundation Engineering
      const foundationKeywords = [
        'bearing capacity', 'foundation', 'strip footing', 'raft',
        'pile', 'footing', 'safe bearing', 'net safe',
        'ultimate bearing', 'allowable bearing',
      ];
      if (foundationKeywords.some(kw => q.includes(kw))) {
        return TOPICS.foundation_engg;
      }

      // Soil Mechanics (default for geotechnical)
      return TOPICS.soil_mechanics;
    }

    case 'rcc-design': {
      // Steel questions (IS 800, lacing, fillet weld, built-up column, etc.)
      // These are misclassified as rcc-design but we assign to RCC Structures
      // since they're already in the DB under this subject
      const steelKeywords = [
        'is 800', 'steel', 'lacing', 'fillet weld', 'built-up',
        'spot welding', 'purlin', 'roof truss', 'ltb',
        'web crippling', 'buckling', 'slenderness',
      ];
      const rccKeywords = [
        'is 456', 'rcc', 'limit state', 'deep beam', 'slab',
        'column', 'wsm', 'working stress', 'fck',
        'formwork', 'striking', 'two-way', 'span/depth',
        'min eccentricity', 'environmental condition', 'min grade',
      ];

      if (steelKeywords.some(kw => q.includes(kw))) {
        // These are steel-design questions but already in rcc-design subject
        // Assign to RCC Structures as closest topic
        return TOPICS.rcc_structures;
      }
      return TOPICS.rcc_structures;
    }

    case 'water-resources-engg': {
      // Hydrology keywords
      const hydrologyKeywords = [
        'hydrology', 'runoff', 'rainfall', 'rain gauge',
        'tipping bucket', 'precipitation', 'evaporation',
        'flood', 'hydrograph', 'unit hydrograph',
        'direct runoff', 'infiltration',
      ];
      if (hydrologyKeywords.some(kw => q.includes(kw))) {
        return TOPICS.hydrology;
      }

      // Water Resources Engineering (canal, irrigation, duty, head works)
      return TOPICS.water_resources;
    }

    case 'transportation-engg': {
      // Highway Engineering
      const highwayKeywords = [
        'highway', 'pavement', 'camber', 'super elevation', 'superelevation',
        'carriageway', 'irc', 'wbm', 'bituminous', 'cement concrete',
        'flexible', 'rigid', 'westergaard', 'cbr', 'gradient',
        'cloverleaf', 'road', 'width', 'traffic',
        'deviation angle', 'vertical curve',
      ];
      if (highwayKeywords.some(kw => q.includes(kw))) {
        return TOPICS.highway;
      }

      // Railway Engineering
      const railwayKeywords = ['railway', 'rail', 'track', 'sleepers'];
      if (railwayKeywords.some(kw => q.includes(kw))) {
        return TOPICS.railway;
      }

      // Airport Engineering
      const airportKeywords = ['airport', 'runway', 'taxiway'];
      if (airportKeywords.some(kw => q.includes(kw))) {
        return TOPICS.airport;
      }

      return TOPICS.highway;
    }

    default:
      return '';
  }
}

async function main() {
  // Fetch all questions with NULL topic_id
  const { data: questions, error } = await supabase
    .from('questions')
    .select('id, question_text, subject_id')
    .eq('exam_id', EXAM_ID)
    .is('topic_id', null);

  if (error || !questions) {
    console.error('Error fetching questions:', error);
    return;
  }

  console.log(`Found ${questions.length} questions with NULL topic_id`);

  // Fetch subject slugs
  const { data: subjects } = await supabase
    .from('subjects')
    .select('id, slug')
    .eq('exam_id', EXAM_ID);

  if (!subjects) {
    console.error('Error fetching subjects');
    return;
  }

  const subjectMap = new Map(subjects.map(s => [s.id, s.slug]));

  // Classify each question
  const updates: { id: string; topic_id: string }[] = [];
  let classified = 0;
  let skipped = 0;

  for (const q of questions) {
    const slug = subjectMap.get(q.subject_id);
    if (!slug) {
      console.warn(`Unknown subject_id: ${q.subject_id}`);
      skipped++;
      continue;
    }

    // Single topic subjects
    if (SINGLE_TOPIC_MAP[slug]) {
      updates.push({ id: q.id, topic_id: SINGLE_TOPIC_MAP[slug] });
      classified++;
      continue;
    }

    // Multi-topic subjects
    const topicId = classifyQuestion(slug, q.question_text);
    if (topicId) {
      updates.push({ id: q.id, topic_id: topicId });
      classified++;
    } else {
      console.warn(`Could not classify: [${slug}] ${q.question_text.substring(0, 80)}`);
      skipped++;
    }
  }

  console.log(`Classified: ${classified}, Skipped: ${skipped}`);

  // Generate SQL UPDATE statements
  const sqlStatements: string[] = [];
  for (const u of updates) {
    sqlStatements.push(
      `UPDATE public.questions SET topic_id = '${u.topic_id}'::uuid WHERE id = '${u.id}'::uuid;`
    );
  }

  // Write SQL to file
  const fs = await import('fs');
  const batchSize = 50;
  for (let i = 0; i < sqlStatements.length; i += batchSize) {
    const batch = sqlStatements.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const filename = `scripts/update_topics_batch_${batchNum}.sql`;
    fs.writeFileSync(filename, batch.join('\n') + '\n');
    console.log(`Written ${filename} (${batch.length} statements)`);
  }

  // Also write a summary
  const summary = `Topic Classification Summary
Total questions: ${questions.length}
Classified: ${classified}
Skipped: ${skipped}
Batches: ${Math.ceil(sqlStatements.length / batchSize)}
`;
  fs.writeFileSync('scripts/classify-summary.txt', summary);
  console.log(summary);
}

main().catch(console.error);
