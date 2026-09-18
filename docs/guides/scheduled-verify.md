# Scheduled local verify

Recurring change-aware QA **without** cloud monitoring SaaS. Prefer built-in watch/hook; use OS schedulers only when you need calendar cadence.

## Primary (built-in)

```bash
# Re-verify on every file change
npx veloprove watch --verify

# Also verify every 5 minutes while watching
npx veloprove watch --verify -i 300

# Pre-commit gate
npx veloprove hook install --verify
```

## Windows Task Scheduler (example)

1. Open Task Scheduler → Create Basic Task → trigger (e.g. daily 09:00).
2. Action: Start a program  
   - Program: `npx` (or full path to `npx.cmd`)  
   - Arguments: `veloprove verify --ci --json`  
   - Start in: your project root
3. Optional: redirect output to `.veloprove/logs/scheduled-verify.log`.

PowerShell one-liner to register (run elevated if needed):

```powershell
$action = New-ScheduledTaskAction -Execute "npx.cmd" -Argument "veloprove verify --ci" -WorkingDirectory "D:\path\to\app"
$trigger = New-ScheduledTaskTrigger -Daily -At 9am
Register-ScheduledTask -TaskName "VeloProveVerify" -Action $action -Trigger $trigger
```

## systemd user timer (Linux)

`~/.config/systemd/user/veloprove-verify.service`:

```ini
[Unit]
Description=VeloProve local verify

[Service]
Type=oneshot
WorkingDirectory=%h/projects/my-app
ExecStart=/usr/bin/npx veloprove verify --ci
```

`~/.config/systemd/user/veloprove-verify.timer`:

```ini
[Unit]
Description=Run VeloProve verify daily

[Timer]
OnCalendar=daily
Persistent=true

[Install]
WantedBy=timers.target
```

```bash
systemctl --user enable --now veloprove-verify.timer
```

## cron

```cron
0 9 * * * cd /home/you/projects/my-app && npx veloprove verify --ci >> .veloprove/logs/cron-verify.log 2>&1
```

## Optional local helpers

Isolated runs (still on your machine):

```bash
npx veloprove verify --ci --sandbox
npx veloprove verify --ci --docker-env
```

Failures write `.veloprove/evidence/<runId>/` (summary + replay + `evidence.zip`).
