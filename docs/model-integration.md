# Real AI Model Integration Guide

The current prototype uses a local demo classifier in `app.js`. This is enough to show the project workflow, but a defense-ready version should use a trained image model.

## Recommended Path for Student Prototype

1. Collect or download waste item images for each category.
2. Organize the dataset into folders:

```text
dataset/
  recyclable/
  biodegradable/
  residual/
  hazardous/
```

3. Train a model using Teachable Machine or transfer learning.
4. Export the model as TensorFlow.js for browser use or TensorFlow Lite for mobile use.
5. Replace the `classifyCanvas()` logic in `app.js` with the model prediction call.

## TensorFlow.js Browser Flow

1. Load the model when the app starts.
2. Convert the canvas image into a tensor.
3. Run model prediction locally.
4. Find the category with the highest probability.
5. Store the result in local history.

Example implementation shape:

```js
const model = await tf.loadLayersModel("model/model.json");
const tensor = tf.browser.fromPixels(canvas).resizeNearestNeighbor([224, 224]).expandDims();
const prediction = await model.predict(tensor).data();
```

## Dataset Tips

- Use clear images from different angles.
- Include different lighting conditions.
- Include campus-specific waste items such as cafeteria cups, bottles, wrappers, and food waste.
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

