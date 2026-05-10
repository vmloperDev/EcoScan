# EcoScan: A Real-Time Waste Classification Framework using Edge-Based Computer Vision and Mobile Data Analytics

## Proponent

Floyd Allen B. Bueno  
BSCS-2C, Gordon College  
2nd Semester, Academic Year 2025-2026

## Sustainable Development Goal

EcoScan is anchored to SDG 12: Responsible Consumption and Production. The project supports more responsible disposal behavior by helping users classify waste items correctly and monitor their recycling habits over time.

## Problem Background

Manual waste segregation is often confusing for students, households, and disposal area users. Even when labeled bins are available, recyclable materials are frequently contaminated because people are unsure whether an item belongs in a recyclable, biodegradable, residual, or hazardous category. In areas with poor internet connection, such as cafeterias, basements, and remote disposal points, cloud-based artificial intelligence tools are less reliable because images must be uploaded before predictions can be made.

EcoScan addresses these issues by moving the waste classification process to the user's local device. Instead of depending entirely on cloud processing, the system uses edge-based computer vision so that classification can happen directly on a smartphone or browser. The updated design follows a progressive strategy: the scanner remains functional offline, stores verified scan results locally, and syncs Eco-Insights only when connectivity is available.

## Project Objectives

The project aims to:

1. Develop a real-time waste classification prototype using browser-based or mobile edge computer vision.
2. Classify waste into practical disposal categories such as recyclable, biodegradable, residual, and hazardous.
3. Reduce user confusion during manual waste segregation.
4. Provide a dashboard that tracks total CO2 reduced, items sorted, system accuracy, weekly sorting statistics, and energy efficiency.
5. Support offline or low-connectivity disposal areas by performing classification locally.
6. Include a manual verification step so users can confirm or reject a classification result before it becomes part of the analytics record.

## Target Users

EcoScan is intended for:

- Eco-conscious households
- Waste management offices
- University campuses
- Students and cafeteria users
- Facility staff responsible for waste collection and monitoring

## Scope

The prototype is organized into three main screens: Dashboard, Scan, and Stats. The Dashboard presents the sustainability summary, the Scan screen contains the cyan-framed Edge AI scanner and YES or NO verification flow, and the Stats screen contains Eco-Insights graphs and verified scan history. It also follows a progressive web app approach through responsive layouts, local storage, app manifest metadata, and offline app-shell caching. A full production system may include user accounts, cloud synchronization, administrator dashboards, campus-wide reports, and a trained custom waste image model.

## Proposed Technology

- Frontend: HTML, CSS, JavaScript, or mobile UI
- Progressive Web App layer: Web app manifest, service worker, local app-shell caching, and responsive screen structure
- Edge AI: TensorFlow.js, TensorFlow Lite, or a Teachable Machine image model
- Local storage: Browser localStorage or mobile SQLite
- Cloud dashboard: Firebase, Supabase, or a web database in the expanded version
- Analytics: Total CO2 reduced, items sorted, system accuracy, weekly statistics, and energy efficiency reports

## Expected Output

The expected output is a working prototype that demonstrates the main EcoScan workflow: capturing an image, classifying the waste item locally, showing a real-time material prediction such as aluminium cans, asking the user to verify the result, and updating the Eco-Insights dashboard.

## Significance

EcoScan can help improve waste segregation accuracy, reduce recycling contamination, and promote responsible consumption habits. Its edge-based approach also reduces dependency on constant internet access and supports more energy-efficient AI use compared with sending every image to a remote server.
