
  1. User submits code or a repo URL.
  2. Your API stores a job record in a DB/queue.
  3. A scheduler finds an idle warm worker.
  4. The scheduler leases that worker to the job.
  5. The worker downloads the user bundle/repo.
  6. The worker runs it inside Docker.
  7. The worker streams logs and reports status.
  8. When done, the worker is marked idle again.

  Instead:

  - provision 1-3 warm workers ahead of time
  - keep them running
  - run each job in a fresh Docker container on the worker

  That gives you:

  - fast demo
  - reasonable isolation
  - much less control-plane work

  Minimal Architecture

  You need only 5 moving parts:

  - api
      - receives job submissions
  - db
      - stores jobs, workers, leases
  - scheduler
      - picks an idle worker
  - worker-agent
      - long-running process on each VM
  - docker
      - actually runs user code

  For hackathon infra:

  - 1 AWS or GCP region
  - 1 VM image
  - 2 warm workers
  - 1 Postgres or even SQLite if you must
  - 1 object store bucket for uploaded code bundles


  Per job:

  - create temp work dir
  - unpack source
  - create container
  - mount work dir read-only if possible
  - expose a chosen internal port if needed
  - run install/build/start commands
  - capture stdout/stderr
  - enforce timeout


  
  1. Pick one cloud only.
      - If you already know AWS, use AWS.
      - If you already know GCP, use GCP.
      - Do not split attention.
  2. Provision 2 warm workers manually or with minimal Terraform.
      - One control/API server
      - Two worker VMs
  3. Build the DB tables.
      - jobs
      - workers
      - worker_leases optional
  4. Build worker registration + heartbeat.
  5. Build scheduler lease logic.
      - one queued job -> one idle worker
  6. Build artifact upload/download.
      - tarball to object storage
  7. Build worker runner with Docker.
      - unpack
      - run container
      - stream logs
      - timeout
      - cleanup
  8. Build status page / CLI output for demo.
      - queued
      - running
      - logs
      - success/failure
  9. Only after that, add automatic provisioning or autoscaling.
