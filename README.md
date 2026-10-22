# NXC

A self-hosted, browser-based file drive for organizing and previewing files. Drive includes folders, image/video/audio views, uploads, sharing, and per-user appearance preferences.

## Features

- Organize files in folders and switch between grid and table layouts.
- Upload files, create folders, and view upload progress.
- Browse recent uploads, images, videos, and music.
- Preview supported files, including image and video previews.
- Share files, manage uploads, and restore or remove items from the trash.
- Customize the wallpaper and file-preview preferences.
- Store data locally or configure PostgreSQL, remote libSQL, or S3.

## Screenshots

Screenshots are in the [`screenshot/`](./screenshot/) folder.

| Home | Recently uploaded |
| --- | --- |
| ![Home view](./screenshot/Screenshot1.png) | ![Recently uploaded files](./screenshot/Screenshot2.png) |

| File and folder actions | Markdown preview |
| --- | --- |
| ![File and folder actions](./screenshot/Screenshot3.png) | ![Markdown preview](./screenshot/Screenshot4.png) |

| Image preview | Empty music view |
| --- | --- |
| ![Image preview](./screenshot/Screenshot5.png) | ![Empty music view](./screenshot/Screenshot6.png) |

| Appearance settings | Preferences |
| --- | --- |
| ![Appearance settings](./screenshot/Screenshot7.png) | ![Preferences](./screenshot/Screenshot8.png) |

## Requirements

- [Bun](https://bun.sh/)
- Node.js-compatible environment for the optional Docker deployment

## Run locally

```sh
bun install
bun run dev
```

The development server runs on [http://localhost:3000](http://localhost:3000). Development uses `data.db` for the database. Local file uploads are stored in `data/uploads` by default.

## Configuration

Copy `.env.example` to `.env` and adjust the values for your environment. In development the database uses `data.db`; in production it defaults to local libSQL at `data/local.db`. Local file storage defaults to `data/uploads`.

```sh
cp .env.example .env
```

| Variable | Purpose |
| --- | --- |
| `USER_EMAIL`, `USER_PASSWORD`, `USER_NAME` | Credentials and display name for the administrator account created when the database is seeded. |
| `JWT_SECRET` | Secret used to sign authentication tokens. Set a strong secret before deployment. |
| `DB_TYPE` | `libsql` (default), `sqlite`, `postgres`, `libsql-remote`, or `libsql-remote-embedded-replicas`. |
| `DATABASE_PATH` | Local database file path; defaults to `data/local.db` outside development. |
| `POSTGRES_URL` | Connection string required when `DB_TYPE=postgres`. |
| `LIBSQL_URL`, `LIBSQL_TOKEN` | Required for remote libSQL database modes. |
| `STORAGE_TYPE` | `local` (default) or `S3`. |
| `LOCAL_STOARGE_PATH` | Local upload directory; defaults to `data/uploads`. |
| `S3_ACCESS_KEY`, `S3_SECRET_ACCESS_KEY`, `S3_URL_WITH_BUCKET` | Required when `STORAGE_TYPE=S3`. |
| `PORT` | Production server port; defaults to `3000`. |
| `MAX_BODY_SIZE` | Maximum request body size in bytes; defaults to 1 GiB. |
| `ENABLE_GUARD` | Configure the authentication guard; enabled by default in production. |

For Docker Compose, keep the database and local uploads in the mounted `./data` directory so they persist across container replacements. Do not commit `.env` or production credentials.

## Build and run

```sh
bun run build
bun run serve
```

The production server listens on port `3000` by default. Static assets are served with long-lived immutable cache headers.

### Docker Compose with the published image

Configure `.env`, then start the published image:

```sh
docker compose up -d
```

The default Compose file uses `ghcr.io/shishantbiswas/nxc:v0.0.1` and persists application data under `./data`.

### Docker Compose with a local build

```sh
docker compose -f dev.docker-compose.yaml up --build
```

This builds the image from the checked-out source and also persists application data under `./data`.

### Published images

GitHub Actions builds and publishes multi-platform images for `linux/amd64` and `linux/arm64` on pushes to `main` and `v*` tags. The default branch updates the `latest` tag; version tags are published as matching image tags. Pull the latest image with:

```sh
docker pull ghcr.io/shishantbiswas/nxc:latest
```

## Development commands

```sh
bun run dev      # Start the development server
bun run build    # Build client and server bundles
bun run serve    # Run the production server after building
bun run lint     # Lint the project with Biome
```
