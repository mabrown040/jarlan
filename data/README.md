# Data Directory

This folder is reserved for bundled, versioned JSON assets that power the historical, mortality, and tax engines.

- `manifest.json` tracks the expected dataset inventory and refresh cadence.
- Raw source downloads should stay out of the app bundle and live in temporary script outputs.
- Final transformed JSON should be deterministic so simulation tests can be reproduced exactly.
