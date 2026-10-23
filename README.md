# DBMS Project

This repository contains two database management system deliverables, organized as separate projects.

| Project | Assignment | Application | Database |
| --- | --- | --- | --- |
| [Project 1](<Project 1/README.md>) | DA2 | Online grocery SQL console with schema browsing and record management | Neon PostgreSQL |
| [Project 2](<Project 2/README.md>) | DA3 | PantryGraph console for SQL, Cypher, schema exploration, and graph visualization | Neon PostgreSQL and Neo4j Aura |

## Live applications

- **Project 1 — DA2:** [https://dbms-console.vercel.app](https://dbms-console.vercel.app/)
- **Project 2 — DA3:** [https://pantrygraph-console.vercel.app](https://pantrygraph-console.vercel.app/)

## Repository layout

```text
Project 1/   DA2 SQL console frontend, backend, database scripts, and documentation
Project 2/   DA3 PantryGraph frontend, API, connectivity checks, Cypher library, and documentation
README.md    Assignment overview and live application links
```

Each project has its own `package.json`, dependencies, environment template, Vercel configuration, and detailed README. Install and run each application from its project folder. Keep local `.env` files private; only `.env.example` files belong in Git.

## Vercel project settings

For deployments from this repository, set the Vercel Root Directory for the DA2 deployment to `Project 1`, and the DA3 PantryGraph deployment to `Project 2`. Each project has a separate Vercel configuration and its own environment variables.
