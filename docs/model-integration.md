# Real AI Model Integration Guide

EcoScan now uses a real browser-side TensorFlow.js model exported from Teachable Machine. The model is loaded by `src/edgeClassifier.js` from the files inside `public/model`, so image classification runs locally on the user's device.

## Recommended Path for Student Prototype

1. Collect or download waste item images for each category.
2. Organize the dataset into folders:

```text
dataset/
  Paper/
  Plastic/
  Organic/
  Battery/
  Glass/
  Metal/
  BackGround/
```

3. Train a model using Teachable Machine or transfer learning.
4. Export the model as TensorFlow.js.
5. Replace the three files inside `public/model`:
   - `model.json`
   - `metadata.json`
   - `weights.bin`
6. Rebuild and redeploy the app.

## TensorFlow.js Browser Flow

1. Load the model when the app starts.
2. Convert the canvas image into a tensor.
3. Run model prediction locally.
4. Find the category with the highest probability.
5. Store the result in local history.

Example implementation shape:

```js
const model = await tf.loadLayersModel("/model/model.json");
const tensor = tf.browser.fromPixels(canvas).resizeNearestNeighbor([224, 224]).expandDims();
const prediction = await model.predict(tensor).data();
```

EcoScan already implements this flow in `src/edgeClassifier.js`, including label mapping, confidence scoring, and background/no-object handling.

## Dataset Tips

- Use clear images from different angles.
- Include different lighting conditions.
- Include campus-specific waste items such as cafeteria cups, bottles, wrappers, and food waste.
- Include many `BackGround` images from the actual presentation environment so the model learns when no waste item is present.
- Keep the number of images balanced across categories.
- Test the model with images that were not used for training.

## Evaluation Metrics

Use these metrics in the final paper or presentation:

- Accuracy
- Precision
- Recall
- Confusion matrix
- Average prediction time
- Offline usability test result
- User satisfaction or ease-of-use survey

## Cloud Dashboard Extension

For the expanded version, sync only scan metadata instead of raw images:

- Category
- Confidence score
- Timestamp
- Location label, if allowed
- User or device ID, if accounts are implemented

This keeps bandwidth low and protects user privacy.
