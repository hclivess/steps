// The notes every lesson searches. Nine short paragraphs from three subjects.
export const CHUNKS = [
  { id: 1, title: 'Sourdough: ready', text: 'A sourdough starter is ready when it has doubled in size within four to eight hours of feeding, smells pleasantly sour and is full of bubbles.' },
  { id: 2, title: 'Sourdough: float test', text: 'The float test: drop a spoonful of starter into water. If it floats, it holds enough gas to raise a loaf.' },
  { id: 3, title: 'Sourdough: baking', text: 'Bake the loaf in a preheated Dutch oven at 250 °C: twenty minutes with the lid on, then twenty more with the lid off until the crust is deep brown.' },
  { id: 4, title: 'Coffee: ratio', text: 'A common brewing ratio is 1:16, one gram of coffee to sixteen grams of water. For one mug that is about 15 g of coffee and 240 g of water.' },
  { id: 5, title: 'Coffee: temperature', text: 'Water temperature for brewing coffee should be 92 to 96 °C. Hotter water makes coffee bitter, cooler water makes it sour and weak.' },
  { id: 6, title: 'Coffee: freshness', text: 'Coffee beans taste best four to twenty-one days after roasting. Store beans in an airtight container away from light; do not refrigerate them.' },
  { id: 7, title: 'Plants: low light', text: 'Pothos, snake plants and ZZ plants tolerate low light and survive in a dim corner.' },
  { id: 8, title: 'Plants: monstera', text: 'A monstera prefers bright indirect light near a window. Direct sun burns its leaves.' },
  { id: 9, title: 'Plants: watering', text: 'Water most houseplants only when the top two centimetres of soil are dry. Overwatering kills more plants than drought.' },
];

// One longer text for the chunking lesson.
export const SOURDOUGH = CHUNKS.slice(0, 3).map((c) => c.text).join(' ');
