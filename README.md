# Gabor Amblyopia Visual Training

Web prototype for Gabor-patch perceptual training inspired by amblyopia visual rehabilitation workflows.

This project is a training and trend-observation prototype only. It does not provide medical diagnosis, treatment claims, prescriptions, or professional medical guidance.

## What It Does

- Presents Gabor patch trials in a browser using Canvas.
- Supports two separate two-choice tasks:
  - Contrast Detection: choose whether the left or right region contains the Gabor patch.
  - Orientation Discrimination: choose whether the center patch tilts left or right.
- Runs each session in three phases:
  - Assessment: estimates baseline contrast thresholds.
  - Training: reinforces trials around the assessment threshold.
  - Retest: estimates post-training thresholds independently from assessment.
- Stores completed sessions locally in browser `localStorage`.
- Shows results by task type and spatial frequency.

## Current Defaults

- Spatial frequencies: `1`, `2`, `4`, `8` cpd.
- Session length:
  - Assessment: `50` trials.
  - Training: `80` trials.
  - Retest: `50` trials.
- Training contrast allocation:
  - 20% easy trials: threshold x `1.3` to `1.6`.
  - 60% core trials: threshold x `0.9` to `1.2`.
  - 20% challenge trials: threshold x `0.75` to `0.9`.
- Minimum valid reaction time: `150ms`.
- Timeout: `8000ms`.

## Threshold Logic

The adaptive controller uses a simplified ZEST-style Bayesian posterior over a log-spaced contrast threshold grid.

- Assessment trials update the assessment posterior.
- Training trials do not update threshold estimates. They use the frozen assessment threshold for threshold-near reinforcement.
- Retest trials update a separate retest posterior.
- Result changes are computed from assessment threshold versus retest threshold.

The psychometric function is evaluated in log contrast space because the threshold grid is log-spaced.

## Display Calibration

Before training, the setup screen includes a simple display calibration control:

- Match the on-screen reference bar to a bank card or 10 cm ruler.
- Enter viewing distance in centimeters.
- The app estimates screen PPI and uses it to convert cpd into pixels-per-degree.

This improves consistency across devices, but it is still not clinical-grade display or luminance calibration.

## Keyboard Controls

During trials:

- `Left Arrow`: choose left / tilted-left.
- `Right Arrow`: choose right / tilted-right.
- On-screen buttons provide the same answer actions.

## Run Locally

Install dependencies:

```bash
npm install
```

Start the Vite dev server:

```bash
npm run dev
```

Open the printed local URL, usually:

```text
http://localhost:5173/
```

If that port is already in use, Vite will automatically choose the next available port.

## Quality Checks

Run the full local quality gate:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Current tests cover:

- ZEST posterior normalization and updates.
- Log-space psychometric probability behavior.
- Simulated convergence across low, mid, and high true thresholds.
- Assessment/retest posterior separation.
- Frozen training thresholds.
- Invalid trial handling, including render failures.
- Display calibration math.
- Local storage round trip.

## Project Structure

```text
src/
  components/          Canvas stimulus rendering component
  domain/              Training config, trial generation, reducer, ZEST logic
  storage/             localStorage session persistence
  vision/              Gabor renderer and display calibration
  App.tsx              Main screen composition and session wiring
```

## Data Storage

Completed sessions are stored locally under:

```text
gabor-training.sessions.v1
```

No backend, account system, or cloud sync is included in this prototype.

## Limitations

- This is not a medical device.
- No clinician workflow or prescription logic is included.
- Browser display calibration is approximate.
- Results are intended for within-session trend observation, not diagnosis.
- Longitudinal dashboards and cloud sync are out of scope for this first prototype.
