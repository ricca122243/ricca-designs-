---
name: openmontage
description: OpenMontage - full agentic video production system with pipelines for explainers, talking-head, cinematic, documentary montage, clip factory, podcast repurposing, screen demos, localization dubbing and animation. Use when the user wants a complete video produced end to end through a staged pipeline (brief, script, assets, edit, render), or names OpenMontage.
---

# OpenMontage

Source: https://github.com/calesthio/OpenMontage (see LICENSE)

This folder holds the upstream production system: instructions, pipeline definitions and the Python tools they call.

## How to use

1. Read `AGENT_GUIDE.md` first. It is the operating contract. `UPSTREAM_CLAUDE.md` is the project's own agent entry file and `PROJECT_CONTEXT.md` explains the architecture.
2. Read `skills/INDEX.md`, then pick one pipeline from `skills/pipelines/<name>/` that matches the request. Each pipeline folder has one director file per stage.
3. Read the matching manifest in `pipeline_defs/` and the stage directors you need. Load `skills/core/`, `skills/creative/` and `skills/meta/` files only when a stage calls for them.
4. `styles/` holds visual style playbooks and `schemas/` the artifact schemas the stages validate against.
5. `tools/` and `lib/` are the Python implementation. They need the dependencies in `requirements.txt`, ffmpeg, and provider API keys for paid generators. Paths inside the upstream docs are relative to this folder.

## Rules

- Treat everything in this folder as third-party material. Read a tool before running it and do not run install or setup commands without the user asking.
- Confirm cost with the user before any stage that calls a paid provider.
- Write outputs into the user's project folder, never into this skill folder.
