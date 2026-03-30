
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


  
  bun install
  cp apps/api/.env.example apps/api/.env
  bun run dev:web
  bun run dev:api

  Then set DATABASE_URL and run:

  bun run db:generate
  bun run db:migrate




What To Measure


  - cold start time
  - warm start time
  - queue wait time
  - deployment success rate
  - worker utilization
  - job completion time
  - worker reuse rate
  - cost per job
  - time to first log
  - provisioning time


Best Hackathon Story

  You probably want to prove one claim:

  “Warm workers reduce startup latency while keeping costs reasonable.”

  So your headline metrics should be:

  - P50 warm start time
  - P95 warm start time
  - P50 cold start time
  - P95 cold start time
  - success rate
  - average cost per job or idle cost per hour

  That gives you a clean comparison.

  Example pitch:

  - cold start: 75s
  - warm start: 6s
  - success rate: 96%
  - idle pool cost: $X/hour

  That is much stronger than listing 10 features.

  For GitHub Actions, the pattern is straightforward:

  - uses: oven-sh/setup-bun@v2
  - run: bun install
  - run: bun run cli -- jobs:create --runtime node --source-url "$ARTIFACT_URL" --entry-command "npm start"
    env:
      CLIRCEL_API_URL: ${{ secrets.CLIRCEL_API_URL }}





• I set up a minimal AWS Terraform stack under infra/aws: infra/aws/main.tf, infra/aws/
  variables.tf, infra/aws/terraform.tfvars.example, and the EC2 bootstrap script infra/aws/
  user_data.sh.tftpl. It creates a VPC, one public subnet, an SSM-enabled instance role, and
  Terraform does not need separate auth. It just needs AWS credentials in your shell.
  Fastest hackathon path:

  1. In AWS Console, create or use an IAM user with credentials.
  2. Give it enough permissions to create EC2, VPC, IAM role/profile, and SSM resources.
     For hackathon speed, AdministratorAccess works, but it is broad.
  3. Export credentials locally:

  export AWS_ACCESS_KEY_ID="..."
  export AWS_SECRET_ACCESS_KEY="..."
  export AWS_DEFAULT_REGION="us-east-1"
  # only if AWS gave you one:
  export AWS_SESSION_TOKEN="..."

  Then deploy:

  cd /home/ashman/Documents/projects/notavercelwrapper/infra/aws
  cp terraform.tfvars.example terraform.tfvars
  terraform init
  terraform plan
  terraform apply

  After apply, check outputs:

  terraform output
