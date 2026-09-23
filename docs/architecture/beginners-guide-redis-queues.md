# Redis, Workers & Queues — A Beginner's Guide (No Expert Words)

> Who is this for: anyone new to the Celebs backend. Read this FIRST, then
> read `docs/architecture/caching-and-ttl-guide.md` for the technical version
> with file names and line numbers. One rule in this guide: every idea is
> explained with the same little food shop. No expert words are used — and if
> one slips in, it is translated on the spot.

---

## The shop (your whole system in one picture)

You own a small food shop with:

- **A cashier** — the website. Takes orders, smiles, answers fast.
- **A kitchen out back with 4 cooks** — the helpers (workers). They do slow
  work: sending emails, resizing photos, night cleaning.
- **4 spikes on the kitchen wall** — the job boards (queues). Paper notes go
  here: "send this email", "resize this photo."
- **One big whiteboard** — Redis. Everyone can read and write it in a blink.
  You **rent** it from a shop called Upstash, and they charge you **for every
  line read or written**. A meter on the wall counts the lines.
- **One big safe book** — the database (Postgres). Money, orders, customers.
  Slow to write, but never forgets anything.

Keep this shop in mind. Everything below happens inside it.

---

## Part 1 — The whiteboard and the bill

Your app must remember small things very fast: who is logged in, what the
home page looks like.

The whiteboard holds these notes so the safe book doesn't have to answer
the same tiny question thousands of times. Reading the whiteboard takes a
blink; asking the safe book takes much longer.

"450k commands" is only the **line counter** on the rented whiteboard — like
a taxi meter. No customers were in the shop, so who wrote 400,000 lines in a
day? **Your own cooks** (Part 2). Not customers. Not hackers. Your own staff,
checking empty spikes all day and night.

---

## Part 2 — Helpers, boards, and why they never stop walking

Slow jobs must never make the customer wait. So the shop splits the work:

1. The **cashier** takes the order, pins a note on the right spike, and says
   "done!" in half a second. The customer leaves happy.
2. Later — seconds later, maybe on a different day — a **cook** picks up the
   note and does the slow job.

Your 4 spikes and 4 cooks:

| Spike (queue)    | Note says                                                | Cook does                                     |
| ---------------- | -------------------------------------------------------- | --------------------------------------------- |
| Emails           | "send welcome letter to Sara"                            | Sends it; retries 5 times if the post fails   |
| Photos           | "make this shoe photo small, medium, tiny"               | Downloads it, makes 4 sizes, stores them      |
| Session cleaning | "throw out expired login wristbands" (every midnight)    | Deletes old rows from the safe book           |
| Order cleaning   | "cancel unpaid orders older than 2 hours" (every 30 min) | Checks payment first, then cancels + restocks |

**Why do cooks check empty spikes forever?** Three reasons, simplest first:

1. **A customer could walk in any second.** An empty spike now says nothing
   about the next second. Watching _is_ the cook's job — like a firefighter
   asleep at the station at 3 AM. Still on duty.
2. **The check is the only safe way to grab a note.** Looking and taking
   happen in one single move, so two cooks can never take the same note.
   There is no "just peek" shortcut.
3. **Some notes have no bell.** Retry notes sleep until their time; crashed
   cooks' half-done notes are found only by a safety round every 30 seconds.
   Only patrolling finds these.

The fix already made in our code: cooks now do their empty rounds **every
60 seconds** instead of every 5. And a fresh note still **rings a bell** that
wakes the cook at once — real work is never late. Only the empty walking got
slower, and the bill drops roughly 12 times smaller.

---

## Part 3 — The ticket that stops double charges

When a customer taps **Pay**, her phone invents a **random ticket number**
for that one payment try (for example `Blue-77`) and sends it with the money
request.

- **She taps twice by mistake?** Same ticket arrives twice. The cashier looks
  in the ticket book: "Blue-77 is already cooking" → second tap refused. Or
  "Blue-77 was already served" → hands back a copy of the old receipt.
  **She is charged exactly once.**
- **Her internet dies after paying?** Tomorrow her phone asks again with
  `Blue-77`. The cashier finds the finished receipt and returns it. Still
  once.
- **Two taps in the same split second?** Ticket numbers can never repeat —
  the safe book physically accepts only one. The second tap bounces off.

Two details that matter:

- **One ticket = one try.** Same try repeated = safe. Starting over = new
  ticket = treated as a new purchase (correct — the cart may have changed).
- **The ticket book lives in the safe book, not on the whiteboard.**
  Money must survive even if someone wipes the whiteboard clean.

---

## Part 4 — Photocopies that throw themselves away

Some answers are expensive: the home page needs 6 big questions to the safe
book. So the cashier **photocopies** finished answers and reuses the copy:

- Home page copy: **tears itself up after 10 minutes.**
- Login wristband (who is logged in): **tears itself up after 24 hours.**
- Each cook's pocket copy of small facts: **tears itself up after 60 seconds.**

Two places hold copies: each helper's **own pocket** (free, only they see
it) and the shared **whiteboard** (costs lines, everyone shares it).

When the boss changes a banner picture, the cashier **tears up that
photocopy at once** instead of waiting — self-tearing is only the backup for
forgotten copies. (Experts call "throw this away after X time" a TTL. You
never need that word again.)

---

## Part 5 — Every problem found, one line each

1. **Shop sign pointed at the wrong wall.** The phone app's picture setting
   named a folder instead of a picture, and the picture was too big for its
   frame. → Fixed. New app file is built and waiting on your computer
   (`apps/mobile/android/app/build/outputs/apk/release/app-release.apk`).
2. **Builders demanded a password nobody has.** The app refused to build on
   home computers. → Fixed. Home computers now skip that step.
3. **Cooks checked empty spikes too often.** The 400k bill. → Fixed in the
   code (60-second rounds), but the internet server still runs the old code
   until you press deploy.
4. **Two trash bins nobody empties.** Failed jobs pile up forever; old ticket
   numbers pile up forever. → Not fixed. Your choice: throw out trash older
   than 24 hours, or keep it forever?
5. **The cashier sets an alarm every 14 minutes all night** so the free
   rented room never falls asleep. Awake all night = full bill. Asleep =
   nearly free, but morning cleaning starts late. → Your choice.

---

## Words you can forget (translation table)

| If an engineer says…  | They mean…                                                |
| --------------------- | --------------------------------------------------------- |
| Redis                 | the rented whiteboard                                     |
| TTL / expiry          | self-tearing note ("throw away after X")                  |
| Queue                 | a spike holding paper notes (jobs)                        |
| Worker                | a cook who reads notes and does slow jobs                 |
| Idempotency key       | the no-double-charge ticket number                        |
| Cron / repeatable job | an alarm clock note (midnight cleaning, 30-minute rounds) |
| drainDelay            | how often cooks walk to empty spikes (now 60 seconds)     |
| Stalled-job check     | safety round: "did any cook faint holding a note?"        |
| Deploy                | carrying the new recipe book to the internet shop         |
| Upstash bill          | the whiteboard shop's line counter                        |

## Where to go next

- Technical version of all of this (file names, line numbers, command
  counts): `docs/architecture/caching-and-ttl-guide.md`.
- When a part of _this_ guide confuses you, copy the exact sentence and ask
  — it gets rewritten three ways until one clicks.
