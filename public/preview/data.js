// Sample data for the preview screens. None of it is real, and nothing here talks to the database.
window.SAMPLE = {
  me: {
    name: "Sam Rivera",
    county: "Fresno County, CA",
    step: 3,
    verified: { by: "Equitide (Plaid)", on: "Oct 12, 2026" },
    stats: { projects: 7, checks: 0, months: 2 },
    nextStep: {
      name: "Checker",
      needs: [
        { text: "3 months in good standing", done: 2, of: 3 },
        { text: "Short checker training", done: 0, of: 1 },
        { text: "No open disputes", done: 1, of: 1 }
      ]
    },
    // What the person can do, for matching with businesses that are hiring. Pay is left to the business and the person.
    lookingFor: { open: true, kinds: ["Temp work", "Part-time"], area: "Within 20 miles of Fresno" },
    canDo: ["Drywall repair", "Plumbing fixtures", "Interior painting", "Doors and locks"],
    certs: ["OSHA 10-hour construction", "EPA lead-safe renovator (RRP)"],
    owns: ["b1"],
    badges: [
      { icon: "🌱", name: "Seed planter", got: true },
      { icon: "🔨", name: "First project", got: true },
      { icon: "⭐", name: "5 projects done", got: true },
      { icon: "🔍", name: "Checker", got: false },
      { icon: "🛠️", name: "Operator", got: false },
      { icon: "🗝️", name: "Keeper", got: false }
    ]
  },

  businesses: [
    {
      id: "b1", name: "Rivera Handyman Services", owner: "Sam Rivera", county: "Fresno County, CA",
      license: "City of Fresno business license, checked Oct 14, 2026",
      services: ["Small home repairs", "Drywall and paint", "Plumbing fixtures", "Doors, locks and hardware"],
      size: { grossUsd: 185000, grossPts: 2400, employees: 2 },
      track: { done: 7, onTime: 6, disputes: 0, largest: 600, average: 380 },
      limit: { now: 3000, rule: "Set from yearly gross, employees and track record. Grows as projects finish on time and pass checks." },
      busy: 55, insured: true, tradeLicenses: [],
      hiring: [
        { title: "Handyman helper", kind: "Temp, 6 weeks", note: "Basic tools, own ride" },
        { title: "Office help, 10 hrs a week", kind: "Part-time", note: "Scheduling and invoices" }
      ]
    },
    {
      id: "b2", name: "Summit Roofing", owner: "Dana Cho", county: "Fresno County, CA",
      license: "CSLB C-39 roofing license, checked Sep 30, 2026",
      services: ["Roof repair", "Gutter cleaning and repair", "Roof inspections"],
      size: { grossUsd: 1400000, grossPts: 5100, employees: 11 },
      track: { done: 12, onTime: 12, disputes: 1, largest: 2400, average: 900 },
      limit: { now: 12000, rule: "Set from yearly gross, employees and track record. Grows as projects finish on time and pass checks." },
      busy: 40, insured: true, tradeLicenses: ["CSLB C-39 roofing"],
      hiring: [{ title: "Roofing laborer", kind: "Permanent", note: "Will train" }]
    }
  ],

  // Local numbers behind funding decisions. In the real build these come from member reports and public data.
  local: {
    "Fresno County, CA": { busy: 52, reporting: 23, lookingForWork: 31, materials: "Available" },
    "Kern County, CA": { busy: 68, reporting: 14, lookingForWork: 19, materials: "Available" },
    "Tulare County, CA": { busy: 47, reporting: 9, lookingForWork: 22, materials: "Available" },
    "California": { busy: 58, reporting: 412, lookingForWork: 2140, materials: "Available" },
    "Nationwide": { busy: 61, reporting: 1906, lookingForWork: 11800, materials: "Mostly available" }
  },

  // The three area levels on the Work page, and the bar a business has to clear to run projects at each one.
  areas: [
    { key: "county", name: "Fresno County, CA", short: "County", need: { done: 0, onTime: 0, open: 2 }, typical: "Up to your size limit" },
    { key: "state", name: "California", short: "State", need: { done: 5, onTime: 80, open: 3 }, typical: "Usually 2,000 to 10,000 points" },
    { key: "nation", name: "Nationwide", short: "Nationwide", need: { done: 15, onTime: 90, open: 3 }, typical: "Usually 5,000 points and up" }
  ],

  // Categories under each project type. "open" lists the area levels where local data says there's room for it right now.
  categories: {
    train: [
      { name: "Home repair helper", open: ["county", "state", "nation"], onsite: true, max: 1200 },
      { name: "Painting trainee", open: ["county", "state", "nation"], onsite: true, max: 1200 },
      { name: "Roofing trainee", open: ["county", "state"], onsite: true, max: 1500, license: "CSLB C-39 roofing" },
      { name: "Electrical trainee", open: ["state", "nation"], onsite: true, max: 2000, license: "CSLB C-10 electrical", why: "No local electricians have room to train right now" },
      { name: "Restaurant kitchen trainee", open: ["county", "state", "nation"], onsite: true, max: 900 },
      { name: "Auto repair trainee", open: ["nation"], onsite: true, max: 1200, why: "Local shops are 85% booked and few members want this work" }
    ],
    common: [
      { name: "Storm drains", open: ["county", "state"], onsite: true, max: 2000 },
      { name: "Trail upkeep", open: ["county", "state", "nation"], onsite: true, max: 3000 },
      { name: "Creek cleanup", open: ["county", "state", "nation"], onsite: true, max: 2500 },
      { name: "Graffiti removal", open: ["county"], onsite: true, max: 800 },
      { name: "Wildfire brush clearing for seniors", open: ["state"], onsite: true, max: 8000, why: "Run statewide so crews can go where the risk is" },
      { name: "Tree care", open: [], onsite: true, max: 0, why: "Not a category yet. It's gaining support in Talk" }
    ],
    word: [
      { name: "Social posts and video", open: ["county", "state", "nation"], onsite: false, max: 2000 },
      { name: "Podcast and radio spots", open: ["county", "state", "nation"], onsite: false, max: 3000 },
      { name: "Sign up a business's suppliers", open: ["county", "state"], onsite: false, max: 600 },
      { name: "Local events and booths", open: ["county"], onsite: true, max: 800 }
    ],
    run: [
      { name: "Support and moderation", open: ["state", "nation"], onsite: false, max: 4000, why: "Run at state level and up" },
      { name: "Hosting and nodes", open: ["nation"], onsite: false, max: 9000, why: "Run nationwide only" },
      { name: "Member data and reports", open: ["county", "state", "nation"], onsite: false, max: 1500 }
    ]
  },

  // How each type splits its points into milestones when you start one. Owners can rename steps.
  milestoneTemplates: {
    train: [["Trainee starts, training plan posted", 0.15], ["Halfway skills check", 0.35], ["Final skills check", 0.5]],
    common: [["Plan and map posted", 0.1], ["Work done, before and after photos", 0.9]],
    word: [["Content or outreach plan", 0.15], ["Posts or calls done", 0.25], ["Results: views and pledges", 0.6]],
    run: [["First month", 0.34], ["Second month", 0.33], ["Third month", 0.33]]
  },

  // What points are created for: work usually paid by taxes or charity, running Dandelions, and paid training.
  // Regular jobs between businesses (like repairs for a landlord) aren't funded; they're paid in points or dollars through the directory.
  types: [
    { key: "train", name: "Pay to train", blurb: "Take on someone who wants to learn a trade. Your business gets points to cover training; you pay the trainee in dollars." },
    { key: "common", name: "Common good", blurb: "Work usually paid for by taxes or charity that isn't getting done: storm drains, trails, creek cleanups, public spaces." },
    { key: "word", name: "Spread the word", blurb: "Posts, videos, podcast spots and outreach to new businesses. Paid mostly on results." },
    { key: "run", name: "Run Dandelions", blurb: "The work of running the system: ID checks, proof checks, hosting, support, moderation." }
  ],

  projects: [
    {
      id: "p2", level: "county", type: "train", title: "Handyman helper, 6 weeks", owner: "Rivera Handyman Services", ownerId: "b1", mine: true,
      county: "Fresno County, CA", points: 600, helpers: 0, status: "working",
      desc: "Rivera takes on one helper who wants to learn repair work, and pays them in dollars. The points go to Rivera to cover the time spent training and the materials.",
      milestones: [
        { title: "Helper starts, training plan posted", points: 100, status: "approved", proof: ["Training plan", "Start date confirmed"], votes: ["yes", "yes", "yes"] },
        { title: "Week 3 skills check", points: 200, status: "todo", proof: [], votes: [] },
        { title: "Week 6 skills check", points: 300, status: "todo", proof: [], votes: [] }
      ]
    },
    {
      id: "p5", level: "county", type: "common", title: "Clear storm drains before the rain", owner: "Summit Roofing", ownerId: "b2",
      county: "Fresno County, CA", points: 450, helpers: 2, status: "working",
      desc: "The city pays for this with taxes but hasn't gotten to the east side this year. Clear and photograph 40 storm drains before the rains.",
      milestones: [
        { title: "Drains mapped", points: 50, status: "approved", proof: ["Map, 40 drains"], votes: ["yes", "yes", "yes"] },
        { title: "Drains cleared", points: 400, status: "review", proof: ["Before: drain 12", "After: drain 12", "Before: drain 13", "After: drain 13", "Dump receipt"], votes: ["yes"] }
      ]
    },
    {
      id: "p1", level: "county", type: "word", title: "Tell the Central Valley about Dandelions", owner: "Valley Buzz Media",
      county: "Fresno County, CA", points: 1200, helpers: 3, status: "open",
      desc: "A main project for local creators. Valley Buzz plans the posts and creators start their own sub-projects under it. Every paid post says it's paid (#ad).",
      subs: ["Podcast spot: Working Class Hour", "Short videos: Fresno food spots", "Instagram series: fix-it Fridays"],
      milestones: [
        { title: "Content plan", points: 150, status: "approved", proof: ["Content plan"], votes: ["yes", "yes", "yes"] },
        { title: "10 posts live", points: 300, status: "todo", proof: [], votes: [] },
        { title: "Results: 5,000 views and 25 pledges through the link", points: 750, status: "todo", proof: [], votes: [] }
      ]
    },
    {
      id: "p3", level: "county", type: "word", title: "Sign up Lupita's Kitchen suppliers", owner: "Lupita's Kitchen",
      county: "Kern County, CA", points: 300, helpers: 0, status: "open",
      desc: "Lupita's Kitchen joined last week. This project reaches out to its 8 regular suppliers: produce, meat, tortillas, paper goods and the linen service.",
      milestones: [
        { title: "Supplier list and first calls", points: 50, status: "todo", proof: [], votes: [] },
        { title: "4 suppliers signed up", points: 250, status: "todo", proof: [], votes: [] }
      ]
    },
    {
      id: "p4", level: "county", type: "train", title: "Paint crew trainee, 8 weeks", owner: "Bright Coat Painting",
      county: "Tulare County, CA", points: 800, helpers: 0, status: "open",
      desc: "Bright Coat takes on one trainee for 8 weeks and pays them at least minimum wage in dollars. The points go to Bright Coat as a training subsidy, for materials and costs.",
      milestones: [
        { title: "Trainee starts, training plan posted", points: 100, status: "todo", proof: [], votes: [] },
        { title: "Week 4 skills check", points: 300, status: "todo", proof: [], votes: [] },
        { title: "Week 8 skills check", points: 400, status: "todo", proof: [], votes: [] }
      ]
    },
    {
      id: "ps1", level: "state", type: "common", title: "Brush clearing for seniors in fire zones", owner: "Golden State Fire Safe",
      county: "California", points: 6000, helpers: 6, status: "open",
      desc: "Clear brush around the homes of seniors who can't do it themselves, in high fire risk areas across the state. Usually paid by grants and charity, and the waitlist is long.",
      milestones: [
        { title: "Homes picked with the local fire departments", points: 600, status: "approved", proof: ["List of 50 homes, no addresses public"], votes: ["yes", "yes", "yes"] },
        { title: "First 25 homes cleared", points: 2700, status: "todo", proof: [], votes: [] },
        { title: "All 50 homes cleared", points: 2700, status: "todo", proof: [], votes: [] }
      ]
    },
    {
      id: "pn1", level: "nation", type: "run", title: "Public log viewer anyone can check", owner: "Open Ledger Co-op",
      county: "Nationwide", points: 8000, helpers: 0, status: "open",
      desc: "Build a simple open-source page where anyone can read the public log and check the daily fingerprint for themselves.",
      milestones: [
        { title: "Design posted for comment", points: 1000, status: "todo", proof: [], votes: [] },
        { title: "Working viewer, open source", points: 4000, status: "todo", proof: [], votes: [] },
        { title: "Three months running", points: 3000, status: "todo", proof: [], votes: [] }
      ]
    },
    {
      id: "p6", level: "nation", type: "run", title: "ID checks for new members", owner: "Equitide",
      county: "Nationwide", points: 900, helpers: 0, status: "working",
      desc: "Equitide runs ID checks through Plaid and sends Dandelions only a yes or no for each person. Paid per batch of completed checks.",
      milestones: [
        { title: "October checks", points: 300, status: "approved", proof: ["Batch report, no personal info"], votes: ["yes", "yes", "yes"] },
        { title: "November checks", points: 300, status: "todo", proof: [], votes: [] },
        { title: "December checks", points: 300, status: "todo", proof: [], votes: [] }
      ]
    }
  ],

  directory: [
    { name: "Rivera Handyman Services", id: "b1", county: "Fresno County, CA", services: "Small home repairs, drywall, plumbing fixtures", takes: "Points or dollars", offer: "10% off repairs paid in points" },
    { name: "Summit Roofing", id: "b2", county: "Fresno County, CA", services: "Roof repair, gutters, inspections", takes: "Points or dollars" },
    { name: "Oak Street Rentals", county: "Fresno County, CA", services: "Rental homes and small offices", takes: "Part of rent in points" },
    { name: "Lupita's Kitchen", county: "Kern County, CA", services: "Restaurant and catering", takes: "Points or dollars", offer: "Free drink with a meal paid in points" },
    { name: "Valley Buzz Media", county: "Fresno County, CA", services: "Social media and video", takes: "Points or dollars" },
    { name: "Bright Coat Painting", county: "Tulare County, CA", services: "Interior and exterior painting", takes: "Points or dollars" }
  ],

  wallet: {
    business: { name: "Rivera Handyman Services", balance: 1240 },
    personal: { name: "Sam Rivera", balance: 85 },
    history: [
      { when: "Oct 27", what: "From Dandelions: Handyman helper, milestone 1", amt: 100, wallet: "business" },
      { when: "Oct 24", what: "From Oak Street Rentals: repairs, 1220 Oak St", amt: 340, wallet: "business" },
      { when: "Oct 22", what: "To Valley Lumber: drywall and screws", amt: -180, wallet: "business" },
      { when: "Oct 20", what: "From a member: old mountain bike", amt: 85, wallet: "personal" },
      { when: "Oct 18", what: "To Lupita's Kitchen: lunch for the crew", amt: -60, wallet: "business" }
    ]
  },

  talk: {
    rooms: [
      { name: "Fresno County", members: 412, new: 6 },
      { name: "California", members: 3870, new: 14 },
      { name: "Everyone, nationwide", members: 21440, new: 52 },
      { name: "Topic: Pay to train", members: 980, new: 3 },
      { name: "Topic: Common good", members: 1210, new: 9 }
    ],
    ideas: [
      { id: "i1", title: "Fund a weekend trades class at Fresno City College", by: "Dana C.", backers: 7, need: 10, weight: "Light", scope: "Fresno County, CA", replies: 12 },
      { id: "i2", title: "Add \"tree care\" as a Common good category", by: "Marcus T.", backers: 64, need: 100, weight: "Heavy", scope: "Nationwide", replies: 31 }
    ],
    ballot: { title: "Make storm drains a top priority in Fresno County this winter", weight: "Light", rule: "Passes with 51% of votes cast", yes: 132, no: 41, ends: "Nov 4" }
  },

  dispute: {
    id: "1042", title: "Storm drain milestone sent back", county: "Fresno County, CA",
    sides: ["Summit Roofing", "Checker panel for p5"],
    claim: "Summit says 6 of the 40 drains were cleared but the photos were taken at night, so the panel couldn't see them. Summit has daytime photos now.",
    steps: [
      { name: "Filed", when: "Oct 20", done: true },
      { name: "Talk it out (7 days)", when: "Oct 20 to 27", done: true, note: "No agreement" },
      { name: "Screening", when: "Oct 28", done: true, note: "Sent to a panel" },
      { name: "Panel of 3 random checkers", when: "Decides by Nov 3", now: true },
      { name: "Ruling posted", when: "" },
      { name: "One appeal, if asked for", when: "" }
    ],
    evidence: ["Night photos, 6 drains", "Daytime photos, same 6 drains", "Panel notes from Oct 19"],
    frozen: 400
  },

  // Sign-up: visitor > verified member > business. Dandelions keeps the yes and the date from the ID check, never ID papers.
  join: {
    agreement: [
      "Points are for verified work and trade between members. They have no cash value, and Dandelions never buys or sells them.",
      "I won't use points to pay anyone's wages. Wages are paid in dollars.",
      "One person, one account, one vote.",
      "What I post as proof is real, and I took it or have the right to share it.",
      "I'll settle disagreements through the dispute steps first, and rulings apply to points and permissions only.",
      "I'm 18 or older."
    ],
    licenseTypes: ["City or county business license", "State contractor license (like CSLB)", "Other state trade or professional license"]
  },

  // An operator runs a node, a distribution account and file storage, as a Run Dandelions project.
  operator: {
    name: "Valley Node Co-op", since: "Sep 2026", pay: 400,
    node: { uptime: 99.94, entries: 1284410, peers: 7, lastPrint: "Oct 29, 11:59 pm", print: "9f3a 61d0 … 7c21 e04b" },
    account: { balance: 48200, min: 20000, max: 80000, start: 50000 },
    storage: { gb: 38, files: 12400, copies: 3 },
    payouts: [
      { when: "Oct 29", what: "Rivera Handyman Services, p2 milestone 1", amt: -100 },
      { when: "Oct 28", what: "Equitide, p6 October checks", amt: -300 },
      { when: "Oct 27", what: "Check fees, 14 checks", amt: -310 },
      { when: "Oct 25", what: "Fine from case 1031, back into the account", amt: 120 }
    ],
    become: ["Checker for a year in good standing", "A small always-on server and a backup", "Sign the operator agreement", "Picked by member vote, with no more than 2 operators per state"]
  },

  // Sample charter wording, only to show how changes work. The real charter is the Dandelions Charter.
  charter: {
    version: "1.0", adopted: "Oct 2026", print: "a71c 9e02 … 52f0 04be",
    principles: [
      "There's plenty to do. Points are created only for verified work.",
      "Points created are capped by the workers and materials available locally. The market comes first.",
      "AI recommends. People decide. Code pays only for verified work.",
      "One person, one vote. Votes are free and can't be bought or sold.",
      "Every step goes on the public log, with no personal info.",
      "No one holds ID papers. ID checks send back only yes or no."
    ],
    proposal: {
      title: "Add a principle: Dandelions never runs or promotes a dollar exchange for points",
      by: "Keeper seat 3", backers: 1240, need: 1072,
      yes: 6120, no: 980, turnout: 33, needTurnout: 25, needYes: 75,
      waitEnds: "Nov 28", signed: 0, signNeed: 4, seats: 9,
      steps: ["5% of members back it", "Open discussion, 14 days", "Vote: 75% yes, 25% turnout", "30-day wait", "Keepers sign (2 of 3)", "Live, new fingerprint posted"], at: 3
    },
    keepers: [
      { seat: 1, who: "Founder", note: "Founder seat, handed off by 2028", ends: "2028" },
      { seat: 2, who: "Dana C.", note: "Elected", ends: "2029" },
      { seat: 3, who: "Marcus T.", note: "Elected", ends: "2027" },
      { seat: 4, who: "Random seat", note: "Picked at random from checkers", ends: "2027" },
      { seat: 5, who: "Lupe R.", note: "Elected", ends: "2028" },
      { seat: 6, who: "Open", note: "Seat opens as members grow", ends: "" },
      { seat: 7, who: "Open", note: "", ends: "" },
      { seat: 8, who: "Open", note: "", ends: "" },
      { seat: 9, who: "Open", note: "", ends: "" }
    ],
    fast: {
      title: "Paused payouts on one project after reused proof photos", by: "4 of 5 keepers", when: "Oct 26", expires: "Nov 25",
      why: "The AI and two checkers found the same photos on an older project. Payouts paused so no points go out while it's looked at. Nothing else changed.",
      yes: 812, no: 90
    }
  },

  // Places for the stats drill-down. Stage: Seed (first pledge), Sprout 1%, Bloom 5%, Puffball 10%.
  places: [
    { id: "us", name: "Nationwide", parent: null, members: 21440, pct: 0.006, businesses: 1906, busy: 61, looking: 11800, open: 214, created: 38200, retired: 4100, note: "Most growth is in small trade businesses. Pay to train projects are filling fastest." },
    { id: "ca", name: "California", parent: "us", members: 3870, pct: 0.01, businesses: 412, busy: 58, looking: 2140, open: 41, created: 7900, retired: 600, note: "Wildfire brush clearing is the biggest common-good need statewide." },
    { id: "tx", name: "Texas", parent: "us", members: 2210, pct: 0.007, businesses: 240, busy: 66, looking: 1300, open: 22, created: 4100, retired: 300, note: "Businesses here are busy. New funding is slowing so it doesn't pull workers from paying jobs." },
    { id: "ny", name: "New York", parent: "us", members: 1640, pct: 0.008, businesses: 151, busy: 63, looking: 980, open: 17, created: 3000, retired: 250, note: "Lots of members want restaurant work. Kitchen trainee projects would fit." },
    { id: "or", name: "Oregon", parent: "us", members: 940, pct: 0.022, businesses: 120, busy: 49, looking: 610, open: 15, created: 2100, retired: 90, note: "Fastest growing state for its size. Trail and creek work is open." },
    { id: "fresno", name: "Fresno County, CA", parent: "ca", members: 412, pct: 0.014, businesses: 38, busy: 52, looking: 31, open: 5, created: 2900, retired: 120, note: "Lots of people here want trade work and repair businesses have room. Pay to train projects would fit well right now." },
    { id: "kern", name: "Kern County, CA", parent: "ca", members: 260, pct: 0.0028, businesses: 21, busy: 68, looking: 19, open: 2, created: 900, retired: 40, note: "Restaurants are joining. Signing up their suppliers is the best next step." },
    { id: "tulare", name: "Tulare County, CA", parent: "ca", members: 190, pct: 0.004, businesses: 14, busy: 47, looking: 22, open: 2, created: 700, retired: 0, note: "Painting and repair shops have room to take trainees." },
    { id: "la", name: "Los Angeles County, CA", parent: "ca", members: 1320, pct: 0.0013, businesses: 130, busy: 57, looking: 760, open: 12, created: 2300, retired: 300, note: "Big county, early days. Spread the word projects matter most here." }
  ],

  // Checker work. Checking is "Run Dandelions" work, so the fee goes to the checker's business, yes or no.
  checks: {
    course: [
      { title: "What a check is", text: "A business says a milestone is done. You go look, take your own photos and say what you saw. You're not the boss of the project. You're a fair pair of eyes." },
      { title: "Who you can't check", text: "Your own business, your customers, your suppliers, your competitors, family and friends. If a ticket comes to you by mistake, pass on it and say why." },
      { title: "Taking proof", text: "Photograph what the checklist asks for, in daylight, with the whole thing in the frame. The app adds the time and place. No faces, no house numbers, no license plates." },
      { title: "Saying no", text: "\"Needs work\" is not a punishment. Say exactly what's missing so the business can fix it. You get paid the same for yes or no, so just call it like you see it." },
      { title: "Staying safe", text: "Don't climb, enter private property without the owner, or go after dark. If a site isn't safe, stop and report it. That still counts as a finished check." }
    ],
    quiz: [
      { q: "A ticket is for your brother-in-law's business. What do you do?", a: ["Take it, you know the work is good", "Pass and say it's family"], right: 1 },
      { q: "Do you get paid more for saying yes?", a: ["Yes, a little", "No, same fee either way"], right: 1 },
      { q: "The checklist asks for drain 12 but it's under a parked car.", a: ["Use the owner's photo instead", "Say so in your notes and photograph what you can"], right: 1 },
      { q: "When do you see the other checkers' answers?", a: ["After you send yours", "Before, so you can match them"], right: 0 },
      { q: "Who decides if the work gets paid?", a: ["The AI", "The checkers"], right: 1 }
    ],
    tickets: [
      {
        id: "t1", project: "p5", milestone: 1, owner: "Summit Roofing", title: "Storm drains cleared", type: "common",
        where: "East Fresno, 6 miles away", how: "On site", fee: 25, by: "Nov 2", offered: 5, taken: 1,
        what: "The app picked 4 of the 40 drains at random. Photograph each one and say if it's clear.",
        items: ["Drain 3, Cedar and Belmont", "Drain 12, Clovis Ave", "Drain 21, Tulare St", "Drain 34, Kings Canyon Rd"]
      },
      {
        id: "t2", project: "p4", milestone: 1, owner: "Bright Coat Painting", title: "Week 4 skills check", type: "train",
        where: "Visalia, 38 miles away", how: "On site", fee: 30, by: "Nov 6", offered: 5, taken: 0,
        what: "Watch the trainee prep and paint one wall. Check off each skill you see.",
        items: ["Sets up drop cloths and tape", "Patches and sands a hole", "Cuts in a clean edge", "Cleans brushes and site"]
      },
      {
        id: "t3", project: "p6", milestone: 1, owner: "Equitide", title: "November ID check batch", type: "run",
        where: "Online", how: "Online", fee: 15, by: "Dec 3", offered: 5, taken: 2,
        what: "Compare the batch report with the sign-up log. Counts should match and the report should hold no personal info.",
        items: ["Count matches the log", "No names, IDs or addresses in the report", "Every yes has a date"]
      }
    ],
    hiddenMine: 1,
    // What the other two checkers on t1 said. Sample only.
    others: [
      { who: "Checker 214", vote: "yes", note: "All 4 clear. Drain 21 has a little new leaf litter, fine." },
      { who: "Checker 88", vote: "yes", note: "Clear. Photos attached." }
    ],
    // What the AI looks at once all three checks are in. It points things out; people decide.
    ai: [
      { ok: true, text: "Every photo was taken at the right drain, within 30 meters" },
      { ok: true, text: "Photos taken in daylight, after the owner said the work was done" },
      { ok: true, text: "No photo has been used before, on this or any other project" },
      { ok: true, text: "All three checkers saw the same thing" }
    ],
    aiFlag: { ok: false, text: "The owner's photo of drain 13 matches a photo from a different project in March. Asking the owner to explain, and two more checkers to look." },
    me: { done: 0, agree: null, earned: 0 }
  },

  log: [
    { when: "Oct 27, 9:12", what: "points.released 100 to Rivera Handyman Services (p2, milestone 1, 3 of 5 checkers yes)" },
    { when: "Oct 27, 8:40", what: "check.vote checker 77: yes (p2, milestone 1)" },
    { when: "Oct 26, 16:03", what: "milestone.proof_added p2 milestone 1, 2 files" },
    { when: "Oct 25, 10:30", what: "project.posted p2 pay to train, 3 milestones, 600 points" }
  ]
};
