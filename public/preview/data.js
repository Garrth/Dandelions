// Sample data for the preview screens. None of it is real, and nothing here talks to the database.
window.SAMPLE = {
  me: {
    name: "Sam Rivera",
    county: "Fresno County, CA",
    step: 3,
    verified: { by: "Equitide (Plaid)", on: "Oct 12, 2026" },
    business: {
      name: "Rivera Handyman Services",
      license: "City of Fresno business license, checked Oct 14, 2026",
      acceptsPoints: true,
      listed: true
    },
    stats: { jobs: 7, rating: 4.8, checks: 0 },
    nextStep: {
      name: "Checker",
      needs: [
        { text: "3 months in good standing", done: 2, of: 3 },
        { text: "Short checker training", done: 0, of: 1 },
        { text: "No open disputes", done: 1, of: 1 }
      ]
    },
    skills: [
      { name: "Drywall repair", level: 4, rate: "$55/hr", proof: "Verified on 4 jobs" },
      { name: "Plumbing fixtures", level: 3, rate: "$60/hr", proof: "Verified on 2 jobs" },
      { name: "Interior painting", level: 3, rate: "$45/hr", proof: "Verified on 3 jobs" },
      { name: "Doors and locks", level: 2, rate: "$50/hr", proof: "Self-reported" }
    ],
    certs: ["OSHA 10-hour construction", "EPA lead-safe renovator (RRP)"],
    // Slow spots: day index 0 = Mon, slot 0 = morning, 1 = afternoon
    slow: [[0, 0], [0, 1], [2, 0], [3, 1], [4, 1]],
    badges: [
      { icon: "🌱", name: "Seed planter", got: true },
      { icon: "🔨", name: "First project", got: true },
      { icon: "⭐", name: "5 jobs done", got: true },
      { icon: "🔍", name: "Checker", got: false },
      { icon: "🛠️", name: "Operator", got: false },
      { icon: "🗝️", name: "Keeper", got: false }
    ]
  },

  types: [
    { key: "word", name: "Spread the word", blurb: "Posts, videos, podcast spots and articles. Paid mostly on results: views and pledges through your link." },
    { key: "upkeep", name: "Home upkeep", blurb: "Repairs and upkeep for landlords and business owners, done in your slow spots." },
    { key: "suppliers", name: "Bring in the suppliers", blurb: "When a business joins, reach out to its suppliers and get them signed up." },
    { key: "trainee", name: "Trainees", blurb: "Take on a trainee. The points go to your business; you pay the trainee in dollars." }
  ],

  projects: [
    {
      id: "p2", type: "upkeep", title: "Slow-day repairs on 4 rental homes", owner: "Rivera Handyman Services", mine: true,
      client: "Oak Street Rentals", county: "Fresno County, CA", points: 600, helpers: 1, status: "working",
      desc: "Small repairs across four rental homes, booked into Monday and Wednesday slow spots. Oak Street Rentals takes points as part of the rent from business tenants and spends them here.",
      milestones: [
        { title: "Walkthrough and repair list", points: 100, status: "approved", proof: ["Repair list, 4 homes", "Photo: 1214 Oak St", "Photo: 1220 Oak St"], votes: ["yes", "yes", "yes"] },
        { title: "Repairs done", points: 400, status: "todo", proof: [], votes: [] },
        { title: "Owner sign-off", points: 100, status: "todo", proof: [], votes: [] }
      ]
    },
    {
      id: "p1", type: "word", title: "Tell the Central Valley about Dandelions", owner: "Valley Buzz Media",
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
      id: "p3", type: "suppliers", title: "Sign up Lupita's Kitchen suppliers", owner: "Lupita's Kitchen",
      county: "Kern County, CA", points: 300, helpers: 0, status: "open",
      desc: "Lupita's Kitchen joined last week. This project reaches out to its 8 regular suppliers: produce, meat, tortillas, paper goods and the linen service.",
      milestones: [
        { title: "Supplier list and first calls", points: 50, status: "todo", proof: [], votes: [] },
        { title: "4 suppliers signed up", points: 250, status: "todo", proof: [], votes: [] }
      ]
    },
    {
      id: "p4", type: "trainee", title: "Paint crew trainee, 8 weeks", owner: "Bright Coat Painting",
      county: "Tulare County, CA", points: 800, helpers: 0, status: "open",
      desc: "Bright Coat takes on one trainee for 8 weeks and pays them at least minimum wage in dollars. The points go to Bright Coat as a training subsidy, for materials and costs.",
      milestones: [
        { title: "Trainee starts, training plan posted", points: 100, status: "todo", proof: [], votes: [] },
        { title: "Week 4 skills check", points: 300, status: "todo", proof: [], votes: [] },
        { title: "Week 8 skills check", points: 400, status: "todo", proof: [], votes: [] }
      ]
    },
    {
      id: "p5", type: "upkeep", title: "Gutter and roof checks before the rain", owner: "Summit Roofing",
      county: "Fresno County, CA", points: 450, helpers: 2, status: "open",
      desc: "Clear gutters and check roofs on 12 homes owned by member businesses, in Summit's slow weeks before the rains.",
      milestones: [
        { title: "Homes scheduled", points: 50, status: "approved", proof: ["Schedule, 12 homes"], votes: ["yes", "yes", "yes"] },
        { title: "Gutters cleared and roofs checked", points: 400, status: "review", proof: ["Before: 418 Elm gutter", "After: 418 Elm gutter", "Roof check sheet", "After: 502 Elm gutter", "Dump receipt"], votes: ["yes"] }
      ]
    }
  ],

  log: [
    { when: "Oct 27, 9:12", what: "points.released 100 to Rivera Handyman Services (p2, milestone 1, 3 of 5 checkers yes)" },
    { when: "Oct 27, 8:40", what: "check.vote checker 77: yes (p2, milestone 1)" },
    { when: "Oct 26, 16:03", what: "milestone.proof_added p2 milestone 1, 3 files" },
    { when: "Oct 25, 10:30", what: "project.posted p2 home upkeep, 3 milestones, 600 points" }
  ]
};
