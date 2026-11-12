// Common shopping searches for the search box's as-you-type suggestions.
// Local and instant: no API call per keystroke. Picking one runs a real Channel3 search.
export const TYPEAHEAD = [
  "noise cancelling headphones", "wireless earbuds", "bluetooth speaker", "over-ear headphones", "gaming headset",
  "espresso machine", "coffee grinder", "drip coffee maker", "milk frother", "electric kettle",
  "air fryer", "stand mixer", "blender", "rice cooker", "slow cooker", "toaster oven", "cast iron skillet", "chef knife",
  "robot vacuum", "cordless vacuum", "air purifier", "humidifier", "space heater", "desk fan",
  "running shoes", "trail running shoes", "hiking boots", "rain jacket", "backpack", "carry-on luggage",
  "mechanical keyboard", "wireless mouse", "gaming mouse", "4k monitor", "monitor arm", "webcam", "usb-c hub",
  "laptop stand", "standing desk", "office chair", "desk lamp", "external ssd", "portable charger",
  "smartwatch", "fitness tracker", "e-reader", "tablet", "kindle", "ipad", "airpods",
  "instant camera", "mirrorless camera", "action camera", "ring light", "microphone", "streaming microphone",
  "electric toothbrush", "hair dryer", "beard trimmer", "massage gun",
  "yoga mat", "adjustable dumbbells", "foam roller", "water bottle", "bike helmet",
  "smart thermostat", "video doorbell", "smart plug", "wifi router", "mesh wifi",
  "sunglasses", "wallet", "watch", "sneakers", "winter jacket",
];

// Up to `max` suggestions that start with, or have a word starting with, what was typed.
export function suggest(query: string, max = 6): string[] {
  const q = query.trim().toLowerCase();
  if (q.length < 1) return [];
  const starts = TYPEAHEAD.filter((s) => s.startsWith(q));
  const words = TYPEAHEAD.filter((s) => !s.startsWith(q) && s.split(/[\s-]+/).some((w) => w.startsWith(q)));
  const contains = q.length >= 3 ? TYPEAHEAD.filter((s) => !starts.includes(s) && !words.includes(s) && s.includes(q)) : [];
  return [...starts, ...words, ...contains].filter((s) => s !== q).slice(0, max);
}
