# git-disposable

Helper for Trust Hardening changed/bisect fixtures.

```js
import { createDisposableGitRepo } from './create-repo.mjs';

const repo = createDisposableGitRepo();
// repo.dir, repo.commitA, repo.commitB
repo.cleanup();
```

Creates a temp git repository (not committed under this folder) with two commits that rename product data.
