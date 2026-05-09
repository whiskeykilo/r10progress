# KNOWLEDGE.md — Garmin R10 Analytics Reference

**Purpose**: Source of truth for any agent working on this codebase. The app's job is to turn Garmin R10 launch monitor data into actionable, prioritized improvement guidance. This doc encodes the analytical framework, benchmarks, data-quality caveats, and diagnostic heuristics the agent must reason from.

**Spine**:
1. **Strokes Gained** = objective function (what to prioritize).
2. **R10 schema + accuracy** = input confidence map (what to trust).
3. **Optimal launch tables** = target state (what "good" looks like).
4. **Population benchmarks** = peer comparison (where the user stands).
5. **D-Plane / ball flight laws** = causal diagnosis (why a shot did what it did).

---

## 1. Strokes Gained — the objective function

Created by Mark Broadie (Columbia) using PGA Tour ShotLink data. Every shot is scored against a baseline expected-strokes-to-hole-out function. Replaces deceptive traditional stats (GIR, fairways hit, putts/round).

**Categories** (what the agent should compute / reference):
- **SG: Off-the-Tee** — driving shots (par 4s and 5s).
- **SG: Approach** — shots from 100+ yards toward the green.
- **SG: Around-the-Green** — shots within 50 yards excluding putts.
- **SG: Putting** — accounts for putt length; a 25-footer made > 3-footer made.
- **SG: Total** = sum of all four.

**Improvement priority (Broadie's headline finding)**:
> Two-thirds of strokes gained between top-10 tour pros and average tour pros come from shots **outside 100 yards**; one-third from inside. Putting is only ~15% of the scoring difference. **Approach play is the single largest driver of scoring.**

For amateurs, the same hierarchy holds with stronger weight on **driving distance** (gets you closer = easier next shot) and **approach proximity**. Putting matters less than feel suggests.

**Key references**:
- Broadie, M. (2014). *Every Shot Counts*. Gotham Books. — the bible.
- Broadie, M. (2011). "Assessing Golfer Performance on the PGA Tour." Free PDF: <http://www.columbia.edu/~mnb2/broadie/Assets/strokes_gained_pga_broadie_20110408.pdf> — has the math for the baseline function.
- DataGolf methodology: <https://datagolf.com/predictive-model-methodology>
- Lou Stagner (Arccos data scientist) on amateur SG benchmarks — Substack & X feed.

**Implication for this app**: the recommendation engine must always weight a metric's improvement potential by its expected SG impact, not by how "off" the number looks in isolation. Spending range time fixing a 5° launch problem on the 7-iron isn't worth it if the user is losing 4 strokes/round on approach proximity.

---

## 2. Garmin R10 data schema — input confidence map

The R10 is a **Doppler radar** monitor. It directly measures 5 parameters and **calculates** the remaining ~12 via modeling. Treat this as a confidence map: weight measured fields higher than derived ones in any diagnostic logic.

### Metrics (full set ~14–17 depending on firmware)

| Metric | Type | Notes & Confidence |
|---|---|---|
| Ball Speed | **Measured** | High confidence. Within 3–5% of TrackMan in testing. |
| Club Head Speed | Measured (radar) | Reasonably accurate vs TrackMan. |
| Smash Factor | Calculated (Ball/Club) | Reliable since both inputs are measured. |
| Carry Distance | Calculated | Accurate outdoors; indoor flight modeling adds variance. |
| Total Distance | Calculated | Includes roll model — environmental assumptions baked in. |
| Launch Angle | Measured/Calculated (varies) | Reliable outdoors; ~3–5% margin. |
| Spin Rate | Calculated | **Lower confidence**, especially indoors. |
| Spin Axis | Calculated | Lower confidence. |
| Apex Height | Calculated | Tied to spin/launch — inherits their error. |
| Angle of Attack (AoA) | Calculated | Useful trend data but not precise enough for tight mechanics work. |
| Club Path | Calculated | Variable; not reliable enough for sub-15 hcp swing diagnostics. |
| Face Angle | Calculated | Same caveat as path. |
| Face-to-Path | Derived | Inherits face + path error. |
| Launch Direction | Calculated | Useful for dispersion trends. |
| Flight Time | Calculated | |

**Authoritative sources**:
- MyGolfSimulator R10 data: <https://mygolfsimulator.com/garmin-r10-data/>
- MyGolfSimulator R10 accuracy: <https://mygolfsimulator.com/garmin-r10-accuracy/>
- Garmin owner's manual: <https://www8.garmin.com/manuals/webhelp/GUID-E2BBF6BE-4276-436F-B697-59ABEFD61933/EN-US/Approach_R10_OM_EN-US.pdf>
- Golf Insider accuracy test vs TrackMan: <https://golfinsideruk.com/garmin-approach-r10-review/>

**Critical accuracy caveat (Golf Insider, tested vs TrackMan)**: ball speed, carry, total distance, and club speed track well. **Spin and lateral metrics (path, face, curvature) are not accurate enough for serious swing-mechanics diagnosis below ~15 handicap.** The app should:
- Display club path / face angle as **trend indicators**, not absolute readings.
- Aggregate over many shots before drawing conclusions on lateral metrics.
- Show explicit confidence bands on derived fields.
- Trust ball speed, club speed, smash, and carry as primary truth.

### Data ingestion notes
- Garmin Golf app stores session data; export paths and APIs are unofficial. The user may export CSVs from the app or use community tools. The agent should ask the user about ingestion mechanism, not assume.
- Indoor vs outdoor flag matters — modeling differs. Capture and store this with each shot.

---

## 3. Optimal launch conditions — target state

These are the "what good looks like" tables. Use them as references for the diagnostic engine — but always ground feedback in **the user's own swing speed bucket**, never tour averages applied universally.

### Driver — optimal launch & spin (centered strike, neutral-to-positive AoA)

Rough framework (from TrackMan / True Spec / PING data):

| Club Speed | Launch | Spin | Notes |
|---|---|---|---|
| < 90 mph | 13–15° | 2,800–3,200 rpm | Need height + spin to carry. Higher AoA helps. |
| 90–100 mph | 12–14° | 2,500–2,900 rpm | |
| 100–110 mph | 11–13° | 2,300–2,700 rpm | |
| 110+ mph (Tour) | ~10.4° | ~2,760 rpm | PGA Tour avg per PING Proving Grounds study. |

**Tour benchmarks**:
- 2025 PGA Tour avg driver club speed: **~116.5 mph**, avg drive **~299.9 yards**, driving efficiency **~2.61 yds/mph**.
- Avg male amateur driver: ~225 yds. 14–15 hcp efficiency: ~2.29 yds/mph.

**AoA matters as much as anything**: positive AoA with driver (+2 to +5°) increases launch and decreases spin → maximum carry. Most amateurs hit *down* on driver, which is the single biggest distance leak.

**Sources for canonical tables (have the agent fetch these for full data)**:
- TrackMan 2024 Tour averages: <https://www.trackman.com/blog/golf/introducing-updated-tour-averages>
- TrackMan terms PDF (driver & 5-iron tour avgs): <https://hankhaney.com/app/uploads/2019/01/TrackmanTERMS.pdf>
- MyGolfSpy launch/spin chart: <https://mygolfspy.com/news-opinion/instruction/optimal-launch-and-spin-chart-for-drivers-are-you-in-the-right-range/>
- True Spec / GOLF.com preferred parameters: <https://golf.com/gear/swing-speed-optimal-trackman-numbers-to-hit-your-drives-farther/>

### 7-Iron — flagship diagnostic club

Fitters use the 7i because it reveals delivery without tee-height confusion (driver) or extreme loft variance (wedges).

**Solid 7-iron window for most golfers**:
- Launch: **15–18°**
- Spin: **6,000–7,000 rpm**
- Peak height: **80–100 ft**
- Descent angle: **45–50°** (for stopping power)
- AoA: **−3 to −5°** (hitting down on the ball)

If outside the window, the diagnostic tree (in order):
1. Dynamic loft (mostly handle position at impact)
2. AoA
3. Strike location (low/high on face)

Source: <https://www.upyourclub.com/7-iron-launch-angle-spin-rate/>

**Caveat — modern lofts vary wildly**: a "7-iron" today can be 25–34° of loft. Strong-lofted 7-irons produce numbers that look more like a traditional 6-iron. The app must let users record their actual loft per club.

### Iron gapping
- Target: **10–15 yard carry gaps** between consecutive irons.
- Inconsistent gaps (e.g., 6i and 7i go the same distance) = a fitting or delivery problem.
- Per-club benchmarks: <https://golflink.com/instruction/ideal-iron-launch-monitor-numbers>

### Descent angle for irons
- ~45° or steeper = good stopping power on greens.
- < 40° = "floaty" or "knuckler" = not holding greens.

---

## 4. Population benchmarks — peer comparison

For the "where do I stand" feature.

**Driving distance distribution (Shot Scope / Arccos, ~hundreds of millions of tracked shots)**:
- Only ~29% of golfers drive it 250+.
- Largest segment: **200–224 yards**.
- Avg male amateur: **~225 yds**. Avg female amateur: **~170 yds**.

**By handicap (approximate, from Arccos)**:
| Handicap | Avg drive |
|---|---|
| Scratch | ~250 yds |
| 5 | ~240 yds |
| 10 | ~230 yds |
| 15 | ~220 yds |
| 20+ | ~200 yds |

**Dispersion (from Lou Stagner / Foresight GCQuad testing)**: 3, 5, and 7 handicaps had a side-to-side dispersion of **~70 yards** with driver (i.e., ±35 yards from intended target) over 5 days. Amateur misses are bigger than amateurs think.

**Sources**:
- Shot Scope blog: <https://shotscope.com/blog/>
- Practical Golf summary of Arccos data: <https://practical-golf.com/average-driving-distance-handicap-age>
- Lou Stagner's Substack & X — best ongoing source for amateur SG / dispersion data.

---

## 5. D-Plane & ball flight laws — causal diagnosis

The agent needs this to *explain* shot shape, not just describe it. The "old" ball flight laws (path determines start, face determines curve) are wrong. Modern (D-Plane) laws:

- **Face angle at impact is responsible for ~85% of the ball's starting direction** (with driver; ~75% for short irons).
- **Club path relative to the face** determines curvature (spin axis tilt).
- A face that is **closed to path** → draw/hook. **Open to path** → fade/slice.

### Shot shape decoder (right-handed golfer)

| Face angle | Path | Result |
|---|---|---|
| Square to target, 0 to path | Straight (rare) |
| Open to target, square to path | Push (no curve) |
| Closed to target, square to path | Pull (no curve) |
| Open to target, more open to path | Push-slice |
| Open to target, closed to path | Push-draw |
| Closed to target, closed to path | Pull-hook |
| Closed to target, open to path | Pull-fade |

**Reference**: TrackMan University on D-Plane: <https://blog.trackmangolf.com/d-plane/>

**App implication**: when categorizing a shot ("you hit a slice"), the agent must reason from face + path *together*. A "slice" with the R10's noisy path/face data also requires aggregation across many shots before being asserted with confidence.

---

## 6. Diagnostic heuristics — common patterns

Encode these as rules in the recommendation engine. All assume aggregated, multi-shot trends, not single shots.

| Pattern | Likely cause | Suggested focus |
|---|---|---|
| Driver low launch + high spin | Negative AoA | Tee higher, ball forward, swing up |
| Driver high launch + high spin (ballooning) | Loft delivery too high, sometimes shaft-related | Fitting check; reduce dynamic loft |
| Driver low launch + low spin | Steep AoA hitting low on face | Tee height + AoA |
| 7i floaty (low spin, low descent) | High dynamic loft, shallow AoA | Compress: ball back, hands forward, steeper AoA |
| 7i hot/low (high spin still ok, low launch) | Delofted at impact, possibly too strong shaft | Loft check, dynamic loft |
| Big smash variance club-to-club | Strike inconsistency | Strike-pattern drills (foot spray, impact tape) |
| Wide carry distance dispersion same club | Strike + tempo | Same as above + tempo work |
| Consistent face-to-path open (R10 trend) | Slice tendency | Path/face training; treat as trend not absolute |
| Wide left-right launch direction | Face control issues | Same caveat — needs trend not single shot |

### Improvement-prioritization rule (the recommender's core logic)
For each issue detected, estimate **expected strokes gained per round** if fixed. Surface issues in descending SG impact, not descending raw error magnitude. A 10% carry-distance increase on driver typically beats a 2° launch correction on 7-iron — but only if the user's SG-OTT is currently deficient relative to their handicap peer group.

---

## 7. Optional — strategy / decision-making layer

Once the app has shot dispersion data, it can recommend course-management strategy à la **Scott Fawcett's DECADE Golf**: aim points, club selection from given distances, given the user's own dispersion. <https://decade.golf>

This is a v2+ feature but worth scaffolding the data model to support it (need full shot dispersion + lie + distance, not just raw launch monitor metrics).

---

## References — full list

1. Broadie, M. *Every Shot Counts* (2014). Gotham Books.
2. Broadie, M. (2011) Assessing Golfer Performance on the PGA Tour. <http://www.columbia.edu/~mnb2/broadie/Assets/strokes_gained_pga_broadie_20110408.pdf>
3. DataGolf methodology. <https://datagolf.com/predictive-model-methodology>
4. TrackMan 2024 Tour Averages. <https://www.trackman.com/blog/golf/introducing-updated-tour-averages>
5. TrackMan glossary PDF. <https://hankhaney.com/app/uploads/2019/01/TrackmanTERMS.pdf>
6. TrackMan University — D-Plane. <https://blog.trackmangolf.com/d-plane/>
7. MyGolfSpy driver launch/spin chart. <https://mygolfspy.com/news-opinion/instruction/optimal-launch-and-spin-chart-for-drivers-are-you-in-the-right-range/>
8. GOLF.com / True Spec preferred parameters. <https://golf.com/gear/swing-speed-optimal-trackman-numbers-to-hit-your-drives-farther/>
9. UpYourClub 7-iron windows. <https://www.upyourclub.com/7-iron-launch-angle-spin-rate/>
10. GolfLink iron benchmarks. <https://golflink.com/instruction/ideal-iron-launch-monitor-numbers>
11. MyGolfSimulator R10 data. <https://mygolfsimulator.com/garmin-r10-data/>
12. MyGolfSimulator R10 accuracy. <https://mygolfsimulator.com/garmin-r10-accuracy/>
13. Garmin R10 owner's manual. <https://www8.garmin.com/manuals/webhelp/GUID-E2BBF6BE-4276-436F-B697-59ABEFD61933/EN-US/Approach_R10_OM_EN-US.pdf>
14. Golf Insider R10 vs TrackMan accuracy test. <https://golfinsideruk.com/garmin-approach-r10-review/>
15. Practical Golf — driving distance by handicap (Shot Scope/Arccos). <https://practical-golf.com/average-driving-distance-handicap-age>
16. Shot Scope insights. <https://shotscope.com/blog/>
17. Lou Stagner Substack. (Search "Lou Stagner golf stats")
18. DECADE Golf. <https://decade.golf>
