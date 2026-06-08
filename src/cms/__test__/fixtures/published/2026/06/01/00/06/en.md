# A Short Note

This article is intentionally brief. It exists only to trip the quality gate's `THIN_CONTENT` check, which rejects any article body with fewer than six hundred words.

There is not much more to say here. The build pipeline should log an error entry shaped like `{ code: "THIN_CONTENT", wordCount, dir }` and skip generating HTML for this article, while still allowing the rest of the batch to build successfully.

A handful of sentences is enough to prove the point: short articles get caught, long articles pass, and the build never crashes because of either case.
