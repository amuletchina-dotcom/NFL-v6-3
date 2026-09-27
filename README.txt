ASTM E1300 NFL V5 - GitHub Pages package

Upload all files and the charts folder to the repository root.

Features:
- Outer/Inner selection
- Monolithic or PVB laminated
- ASTM chart auto-selection
- Calibrated 4-side NFL calculation
- Original ASTM chart display
- Highlighted panel point, AR line, calibrated NFL contour and value

Calibration anchors:
- 6 mm monolithic 1200x1500 = 2.50 kPa
- 6 mm monolithic 1520x1900 = 1.80 kPa
- 6 mm monolithic 2000x2800 = 1.00 kPa
- 8 mm laminated 1520x1900 = 2.50 kPa

V6 FIXED:
- Fixed JavaScript syntax failure that prevented Calculate NFL from running.
- Fixed missing support-change event, so the Left/Right vs Top/Bottom selector now appears when 2-side support is selected.
- 2-side support passes supportedEdges into the NFL engine.
- A1.27/A1.43 output NFL plus highlighted thickness line, guides, intersection and value.

V6.1 RANGE FIX:
- A1.27 / A1.43 no longer report extrapolated precise NFL values outside the printed chart.
- Below chart minimum: display '< 0.25 kPa' for A1.27 or '< 0.20 kPa' for A1.43.
- Above chart maximum: display '> 10.00 kPa' or '> 8.00 kPa'.
- Monolithic 5 mm on A1.27 now displays 'NOT COVERED' instead of MANUAL.
- Out-of-range thickness line remains highlighted for visual review, but no fake intersection is plotted.

V6.2 ONE-EDGE:
- Added automatic ASTM one-edge/cantilever NFL for Fig. A1.28 (monolithic) and A1.44 (PVB laminated).
- When 1-side support is selected, user chooses Left / Right / Top / Bottom supported edge.
- Program derives the unsupported/cantilever length from panel width or height.
- A1.28 and A1.44 digitized line families use q = C/L^2, calibrated directly from the supplied ASTM chart images.
- Chart overlay highlights selected thickness/designation line, unsupported-length guide, intersection and NFL.
- Out-of-chart load or unsupported-length ranges are explicitly flagged instead of extrapolated as ASTM values.

V6.3 LAMINATED DESIGNATION DETAIL:
- Laminated input now shows ASTM minimum-thickness conversion for each glass ply.
- Example: 8 mm nominal -> 7.42 mm minimum; 10 mm nominal -> 9.02 mm minimum.
- Displays PVB contribution and total thickness used to select ASTM laminated designation.
- ASTM special designation cases are flagged when applied.
