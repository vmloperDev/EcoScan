# EcoScan System Requirements

## Functional Requirements

1. The system shall allow users to scan a waste item using a device camera.
2. The system shall allow users to upload an image when camera access is unavailable.
3. The system shall classify waste into recyclable, biodegradable, residual, or hazardous categories.
4. The system shall display a confidence score for each classification.
5. The system shall display a detected material label such as aluminium can, food waste, mixed wrapper, or battery.
6. The system shall provide disposal instructions based on the predicted category.
7. The system shall ask the user to verify classification results using YES and NO buttons.
8. The system shall store verified scan history locally on the device.
9. The system shall display analytics based on the user's verified scan history.
10. The system shall show whether the device is online or offline.
11. The system shall support use in weak-connectivity environments.
12. The system shall allow the user to clear local scan history.
13. The system shall provide three main screens: Dashboard, Scan, and Stats.

## Non-Functional Requirements

1. The interface should be responsive for mobile and desktop screens.
2. Classification should run locally on the user's device.
3. The system should remain usable without an active internet connection.
4. The dashboard should update immediately after each verified scan.
5. The design should be simple enough for quick use near disposal bins.
6. User scan data should be stored privately unless cloud sync is enabled.
7. The scanner interface should clearly show when Edge AI processing is active.
8. The application should include progressive web app metadata and offline app-shell caching.

## Main Modules

### Dashboard Module

Displays the main sustainability summary, including total CO2 reduced, items sorted, system accuracy, local energy saved, progressive mode, and SDG 12 impact.

### Scanning Module

Handles camera access, image upload, preview display, image capture, and the cyan-framed active scanning viewfinder.

### Classification Module

Processes the image locally and returns the predicted waste category, detected material label, and confidence score.

### Verification Module

Allows users to confirm or reject a classification result before it is added to Eco-Insights.

### Guidance Module

Shows the correct bin or handling instruction for the classified waste item.

### Analytics Module

Powers the Stats screen by tracking weekly sorting statistics, energy efficiency, category distribution, and verified scan history.

### Offline Storage Module

Stores scan results locally so the prototype remains useful in low-connectivity locations.

### Progressive App Shell Module

Provides installable app metadata and caches the main interface files so the app shell can reopen after the first visit, even during weak connectivity.

## Suggested Waste Categories

- Recyclable: plastic bottles, cans, clean paper, cardboard, glass
- Biodegradable: food scraps, leaves, fruit peels, vegetable waste
- Residual: wrappers, sachets, contaminated paper, tissue, styrofoam
- Hazardous: batteries, bulbs, medicine waste, chemicals, paint containers
