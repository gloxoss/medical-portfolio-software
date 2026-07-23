# Social Media Caption

## LinkedIn / X Post

Day 14 of building MediCore HIS 🏥

✅ Scaling the frontend memory limits natively: Why I deprecated React Context in favor of Zustand for global operations contexts today.

What changed:
→ Extracted the core `AuthContext` (tokens, org roles, active facilities) natively out of the React DOM.
→ Implemented a high-speed JavaScript singleton store using Zustand.
→ Leveraged a "Hook Facade Design Pattern" to perfectly route legacy `useAuth()` calls straight into Zustand logic.

The problem? React Context forces aggressive, cascading DOM tree diffs on any value shift. When managing complex Hospital Operation tables with thousands of rows, flipping a "Facility Context" choked the UI. Zustand explicitly ignores unaffected children dynamically — producing buttery smooth switching experiences. 🚀

Tech: Next.js 14 + Zustand + TypeScript

Architecture decisions:
• State lives entirely out-of-boundary of the DOM.
• Implemented Facade Pattern for seamless CI/CD merge (Zero downstream UI files needed to be edited).

Code + interactive breakdown coming to the blog soon!

#buildinpublic #healthtech #reactjs #nextjs #zustand #typescript #softwarearchitecture #performance
