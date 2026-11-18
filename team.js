// Team fact sheet used by the judge feedback and the "talking points" button.
// Source: Rusty Crabs Qualifier 1 engineering portfolio. Edit freely; keep it factual and current.
// Tip: write in the team's own words. Numbers, names of events, and dates are what judges reward.
const TEAM = `
TEAM: Rusty Crabs, FTC #25950, Plano, Texas. Third-year team, 5 members (grades 6, 9, 10, 10, 10).
Roles: captain + hardware (founding member); software + driver; driver + software; hardware + driver coach; connect & outreach lead (6th grader, first year).
Mentors: two coaches — one mentors hardware and programming, the other mentors driving and outreach.
Mission: ignite a passion for STEM in youth; equal opportunities; grow technical and interpersonal skills.
Season goals: learn fundamental FTC skills; build a productive learning environment; apply FIRST Core Values for a sustainable team.
Impact numbers: 5 members, 21 family members, ~200 friends, 500+ accounts reached, 2000+ people made aware of FTC.

ROBOT (BIOBUZZ): 17.5" x 17.0" x 16.5", 25 lb. 4-motor mecanum drivetrain, goBILDA 312 RPM. Sensors: odometry pods, Control Hub IMU, Limelight 3A camera.
Subsystems: active intake (fast floor pickup), high-inertia flywheel launcher for the 5-inch artifact, dual launcher turret (launches pollen and nectar simultaneously), mechanical pollen/nectar splitter, custom aluminum frame. Mix of 3D-printed parts (launcher, splitter, turret structure: fast iteration, geometric freedom, low cost) and COTS parts (frame, motors, gears: reliability, modularity, precision).
Hardware design goals: fast intake, reliable launching, robust under heavy defense; modular so it is easy to maintain and iterate.

THINK / ENGINEERING PROCESS: Adopted the NASA 7-step Engineering Design Process (Ask, Imagine, Plan, Create, Test, Improve, Share) because NASA/SpaceX make aerospace real for a Texas team and it reflects how professionals iterate through failure.
Ask: analyzed Game Manual parts 1 & 2 for scoring and constraints; defined Must-have vs Nice-to-have (Must: auto secure one tip, teleop turret; Nice: auto 2 tips, launch while driving). Imagine: brainstormed chassis, intake, launcher, sorting, protection. Plan: Fusion 360 CAD + wiring diagram → bill of materials; reused last season's motors, servos, wheels to save cost. Create: first version built for the Oct 24, 2026 scrimmage. Test: real field conditions, gathered auto/teleop data. Improve: use test data to find weak subsystems. Share: design published on GitHub.
Meeting rhythm: Tuesday 1-hour online meeting (report, problems, plan); Saturday 3-hour in-person build. Work in two groups (hardware, software); while one builds the other plans next steps and the portfolio. Progress tracked in Slack and GitHub.
Improvements from last season (Decode) to BIOBUZZ: added turret that automatically faces the Hive; launch accuracy via motor RPM + turret hood; two turret systems for pollen and nectar; rebuilt frame in custom aluminum. Planned next: pad for intaking pollen from the flower, mechanism to score in the flower, redesign intake-to-outtake transition.
Match strategy: 4 people at the field (driver coach as strategist talking to the alliance, 2 drivers, human player). Robot designed to hold ONLY 4 artifacts to avoid penalties; drivers watch the alliance protection zone.

CONTROL: Odometry calibrates autonomous to reduce drift (auto now scores 9 balls more consistently). Limelight AprilTags give distance → calibrate robot angle, launch angle and flywheel speed; a trained vision model (Hive Vision library) detects pollen vs nectar for intake alignment.
Current-based launch counter: shooter motor current shows a peak on each launch; code counts shots when current exceeds a threshold. Benefits: no extra sensor (lower cost), fewer wiring failure points, near real-time.
Launch physics: projectile model with launch height 0.4 m, 45° angle, target 5 m/s; RPM from flywheel diameter 0.072 m and efficiency 0.85 → ~3122 RPM (~1600 ticks/s). Simulated trajectories for several speeds/angles before choosing.
Flywheel mass analysis with conservation of energy: adding 372 g (two 186 g mass rings) drops RPM only ~56 per launch, so shots stay consistent.
PID control for: driving to a position via odometry; rotating the launcher toward the goal via Limelight; holding flywheel RPM.
Mechanical pollen/nectar splitter: an opening larger than pollen but smaller than nectar sorts by size with no sensors, wiring or code.
Gamepad: PS5 controllers for reliability; custom 3D-printed clip so the cable port doesn't disconnect.

INNOVATE: (1) Backspin launch — ball exits under the flywheel with backspin so it keeps moving into the HIVE instead of bouncing out; field tests showed 15% improvement over forward spin. (2) 3D-printed rotatable launch box — tunable compression (iterated inner diameter for energy transfer without stalling), integrated rotation gear for compactness, one-piece robustness under defense. (3) Dynamic caching gamepad — 4 preset launch positions plus a Recall button that reuses the last successful angle/speed so the driver can focus on strategy.

REACH: Primary mentors for two local FLL teams (#71391 Chickenhacker, #60098 Digitaldominator). Core volunteers at the FIT F-League Meet 2: 18 FTC teams supported, 200+ participants and parents, roles in field setup and game announcing.
Annual FTC Outreach Survey: surveyed ~500 teams nationwide to build a knowledge base on how teams do outreach. Prototyped the survey like a mechanism: 5 open-ended questions → "3-minute rule" → all multiple choice; beta-tested with 3 partner teams and the FTC program delivery partner; launched on Google Forms. Four channels (cold email to ~500 teams, digital community, peer networking, gift-card raffle). 69 validated responses (~14%). Findings: 83% of teams do outreach by mentoring other FIRST teams; only 41% work with industry/universities; 75% of teams with no outreach cite small team size, 50%+ cite limited knowledge, money was the lowest barrier (12.5%); 75% say partnerships make outreach sustainable, documentation (61%) and succession planning (55%) lag. Presented results at a Conclusion Event with veteran teams (30030 Exodus, 4133 Fusion, 9848 GearView, 15083 Overclock) and the program delivery partner; recording on YouTube.

CONNECT: Zoom seminars with three UNT professors (multi-robot systems; CAD & 3D printing; autonomous vehicles). Online classes: NASA STEMonstrations engineering design process; Stanford medical robots tutorial. Studied three IEEE engineering-education papers to design the outreach survey and analyze the data. Learning plan: each member has a role and skills goals for the season; coaches mentor by area.

SUSTAIN: Balanced budget with several income sources (fundraising, grants); expenses and revenue tracked with tools; reuse parts and plan purchases; community fundraising events double as outreach; multi-year financial plan. Structured training in CAD, programming, mechanical design and strategy; documentation, code repos and build guides preserve knowledge; returning members teach new members; milestone checklists, robot performance metrics and post-meet reviews. Leadership pipeline: new members paired with experienced mentors, leadership workshops (communication, project planning, decision-making), reflection meetings.
`;
