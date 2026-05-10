import * as tf from "@tensorflow/tfjs";

const MODEL_URL = "/model/model.json";
const METADATA_URL = "/model/metadata.json";

let modelBundlePromise;

const categories = {
  metal: {
    code: "AL",
    item: "Metal Can",
    label: "Recyclable",
    impact: 0.05,
    color: "#00d2ff",
    instruction: "Clean the item if needed, then place it in the recycling bin."
  },
  plastic: {
    code: "PL",
    item: "Plastic Bottle",
    label: "Plastic",
    impact: 0.02,
    color: "#3a7bd5",
    instruction: "Empty or wipe the plastic item first. Flatten bottles if possible, then place it in the recycling bin."
  },
  biodegradable: {
    code: "FW",
    item: "Organic Waste",
    label: "Biodegradable",
    impact: 0.03,
    color: "#22c55e",
    instruction: "Place this item in the compost or biodegradable waste bin."
  },
  paper: {
    code: "PC",
    item: "Paper/Cardboard",
    label: "Paper/Cardboard",
    impact: 0.01,
    color: "#f59e0b",
    instruction: "If clean and dry, sort it as paper or cardboard. If wet, greasy, or dirty, place it in residual waste."
  },
  glass: {
    code: "GL",
    item: "Glass Bottle",
    label: "Recyclable",
    impact: 0.04,
    color: "#14b8a6",
    instruction: "Empty the glass item carefully, then place it in the glass recycling bin."
  },
  hazardous: {
    code: "HZ",
    item: "Battery",
    label: "Hazardous",
    impact: 0.04,
    color: "#ef4444",
    instruction: "Do not place this in normal bins. Send it to a hazardous waste collection point."
  }
};

const labelAliases = {
  aluminium: "metal",
  aluminum: "metal",
  cardboard: "paper",
  battery: "hazardous",
  batteries: "hazardous",
  food: "biodegradable",
  garbage: "biodegradable",
  metal: "metal",
  organic: "biodegradable",
  paper: "paper",
  plastic: "plastic",
  glass: "glass"
};

const keywordRules = [
  { words: ["aluminium", "aluminum", "can", "tin", "metal"], key: "metal" },
  { words: ["plastic", "bottle", "pet"], key: "plastic" },
  { words: ["food", "banana", "apple", "leaf", "vegetable", "fruit", "organic"], key: "biodegradable" },
  { words: ["paper", "cup", "cardboard", "carton"], key: "paper" },
  { words: ["glass", "jar"], key: "glass" },
  { words: ["battery", "bulb", "chemical", "medicine", "paint"], key: "hazardous" }
];

export async function classifyWasteFromCanvas(canvas, sourceName = "") {
  const hintedKey = classifyByName(sourceName);

  try {
    const { imageSize, labels, model } = await loadModelBundle();
    const predictions = await runPrediction(model, labels, imageSize, canvas);
    const bestPrediction = [...predictions].sort((a, b) => b.probability - a.probability)[0];

    if (bestPrediction?.className) {
      const key = normalizeLabel(bestPrediction.className);
      const confidence = Math.round(bestPrediction.probability * 100);

      if (categories[key] && confidence >= 30) {
        return buildResult(key, confidence, sourceName, "Teachable Machine", predictions);
      }
    }
  } catch (error) {
    console.warn("EcoScan model unavailable, using local fallback classifier.", error);
  }

  const stats = sampleCanvas(canvas);
  const key = hintedKey || classifyByPixels(stats);
  const confidence = hintedKey ? 94 : confidenceFromStats(stats);
  return buildResult(key, confidence, sourceName, "Local fallback");
}

async function loadModelBundle() {
  if (!modelBundlePromise) {
    modelBundlePromise = Promise.all([
      tf.loadLayersModel(MODEL_URL),
      fetch(METADATA_URL).then((response) => {
        if (!response.ok) {
          throw new Error("Model metadata could not be loaded.");
        }

        return response.json();
      })
    ]).then(([model, metadata]) => ({
      model,
      labels: metadata.labels || [],
      imageSize: metadata.imageSize || 224
    }));
  }

  return modelBundlePromise;
}

async function runPrediction(model, labels, imageSize, canvas) {
  const input = tf.tidy(() => {
    const pixels = tf.browser.fromPixels(canvas).toFloat();
    const resized = tf.image.resizeBilinear(pixels, [imageSize, imageSize]);
    const normalized = resized.sub(127.5).div(127.5);
    return normalized.expandDims(0);
  });

  const output = model.predict(input);
  const probabilities = Array.from(await output.data());
  input.dispose();
  output.dispose();

  return probabilities.map((probability, index) => ({
    className: labels[index] || `Class ${index + 1}`,
    probability
  }));
}

function buildResult(key, confidence, sourceName, engine, predictions = []) {
  const category = categories[key] || categories.metal;
  const topPredictions = predictions
    .map((prediction) => {
      const predictionKey = normalizeLabel(prediction.className);
      return {
        label: categories[predictionKey]?.item || prediction.className,
        confidence: Math.round(prediction.probability * 100)
      };
    })
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3);

  return {
    ...category,
    categoryKey: key,
    confidence,
    engine,
    predictions: topPredictions,
    source: sourceName || "Camera capture",
    createdAt: new Date().toISOString()
  };
}

function normalizeLabel(label) {
  const normalized = label.toLowerCase().trim();
  return labelAliases[normalized] || normalized;
}

function classifyByName(sourceName) {
  const normalized = sourceName.toLowerCase();
  const match = keywordRules.find((rule) => rule.words.some((word) => normalized.includes(word)));
  return match?.key || null;
}

function sampleCanvas(canvas) {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  const width = Math.min(canvas.width, 180);
  const height = Math.min(canvas.height, 140);
  const image = context.getImageData(0, 0, width, height).data;
  let red = 0;
  let green = 0;
  let blue = 0;
  let brightness = 0;
  let saturation = 0;

  for (let index = 0; index < image.length; index += 4) {
    const r = image[index];
    const g = image[index + 1];
    const b = image[index + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    red += r;
    green += g;
    blue += b;
    brightness += (r + g + b) / 3;
    saturation += max - min;
  }

  const pixels = image.length / 4 || 1;
  return {
    red: red / pixels,
    green: green / pixels,
    blue: blue / pixels,
    brightness: brightness / pixels,
    saturation: saturation / pixels
  };
}

function classifyByPixels(stats) {
  if (stats.green > stats.red * 1.08 && stats.green > stats.blue * 1.02) {
    return "biodegradable";
  }

  if (stats.blue > stats.green * 1.08 && stats.brightness > 80) {
    return "plastic";
  }

  if (stats.red > 135 && stats.green < 105 && stats.saturation > 55) {
    return "hazardous";
  }

  if (stats.brightness > 155 && stats.saturation < 45) {
    return "paper";
  }

  return "metal";
}

function confidenceFromStats(stats) {
  const contrastBoost = Math.min(18, stats.saturation / 6);
  const brightnessPenalty = stats.brightness < 35 ? 10 : 0;
  return Math.max(62, Math.round(72 + contrastBoost - brightnessPenalty));
}
