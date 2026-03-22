License: https://creativecommons.org/licenses/by-nc/4.0/

Trouble keeping track of tests and homework due dates? Introducing the Homework Calendar 9000! In one place, you can add tests and assignments and it will remind you and help you prioritize your next assignment :D

This homework calendar can be used by multiple people (an entire family, friends, a school)

I thought I'd use Bun this time instead of NodeJS to try something new
I must say- `bun install` is faster than `pnpm` and `npm` hehe; I love `bun install`

# Hosting instructions

1. Install Bun :D
2. Clone the repo
3. `cd` into the frontend and backend directories and run `bun install` in each
4. In the backend folder, run `bunx drizzle-kit generate`
5. Run `bun run dev` in both folders too
6. Visit `localhost:3000` in your browser
7. Use it to organize your messy student life :p

---

You can allow multiple users to exist and have endable/disable logins and registration by changing in the `config.json` file in the backend folder.

---

The goal of this homework calendar is to give you a place to track your assignments and whatnot.

The reason I added the functionality to disable logins/registration is because I would be hosting this on my person domain but I didn't want other people using my instance.
