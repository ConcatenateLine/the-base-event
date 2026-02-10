# Event Notifications – Design & Implementation Notes

## 🎯 Goals

- Provide a **framework‑agnostic notification bus** (works in React, Angular, Vue, Node).
- Ensure **no lost events** even if emitted before subscribers attach.
- Support **middleware and plugins** for extensibility.
- Ship as a **TypeScript package** with JS compatibility.
- Establish a robust dev environment for contributors.

---

## ⚠️ Common Issues in Async Event Systems

1. **Lost Events (Race Conditions)**  
   - Emitted before subscribers mount → disappears.  
   - **Solution**: Buffer + replay.

2. **Late Subscription**  
   - Framework components mount after emitter fires.  
   - **Solution**: Sticky notifications or buffered replay.

3. **Duplicate Delivery**  
   - Multiple subscribers on same channel.  
   - **Solution**: Deduplication via unique `id`.

4. **Uncontrolled Memory Growth**  
   - Buffers grow without limit.  
   - **Solution**: TTL + max buffer size.

5. **Subscriber Cleanup**  
   - Forgetting to unsubscribe → leaks.  
   - **Solution**: Always return unsubscribe function.

6. **Cross‑Framework Timing**  
   - React hooks vs Angular services vs Vue composables.  
   - **Solution**: Global singleton emitter + adapters.

7. **Async Middleware**  
   - Middleware resolves after subscribers already processed.  
   - **Solution**: Support async chain with `await`.

8. **SSR/CSR Mismatch**  
   - Notifications emitted during server render don't sync with client hydration.  
   - **Solution**: Delay emission until client mount.

---

## 🛠 Dev Environment Setup

- **TypeScript** for strict typing + `.d.ts` output.
- **Rollup** for dual builds (CJS + ESM).
- **Jest** for async test coverage.
- **ESLint + Prettier** for contributor standards.
- **Semantic Release** for automated versioning.

### Package structure

```
src/ 
 core/  # Emmiter, buffer, middleware
 adapters/ # Framework wrappers: Reack hook, Angular service, Vue composables
 plugins/ # Logging, analytics, transforms
 test/ # Jest suites
 styles/ # Optional UI
```

### Emiters features

- Channels: emit(channel, message, type)
- Middleware: use(fn) intercepts notifications.
- Plugins: register(plugin) for reusable extensions.
- Buffer Replay: stores events until subscribers attach.
- Unsubscribe Contracts: cleanup prevents leaks.

### Testing strategy

- Emit before subscribe → buffered replay works.
- Multiple subscribers → deduplication validated.
- Async middleware → order + blocking tested.
- Unsubscribe → cleanup confirmed.

### Best practices

- Keep emitter global and independent of framework lifecycle.
- Provide thin adapters for React, Angular, Vue.
- Enforce TTL + max buffer size to avoid leaks.
- Document plugin API for contributors.
- Use semantic commit messages (with icons if desired) for release automation.

## Deliverables

- Core emitter with channels, middleware, buffer replay, unsubscribe contracts.
- Framework adapters:
  - React hook (useNotificationChannel)
  - Angular service (NotificationService)
  - Vue composable (useNotificationChannel)
- Plugin system (logging, analytics, transforms).
- Dev environment setup with TypeScript, Rollup, Jest, ESLint, Prettier.
- Documentation:
  - Design & Implementation Notes (Markdown)
  - Contributor Guide (plugin/adapters onboarding)
- Automated release pipeline (semantic‑release).

## Roadmap

- Initialize dev environment.
- Implement core emitter with async‑safe buffer.
- Write starter Jest test suite.
- Add middleware chain (sync + async).
- Implement plugin registration system.
- Draft framework adapters (React, Angular, Vue).
- Expand test coverage (buffer replay, unsubscribe, async middleware).
- Document package structure and contributor guide.
- Finalize build pipeline (Rollup, type definitions).
- Publish initial npm release.

## Action Items

[ ] Scaffold dev environment with TypeScript, Rollup, Jest, ESLint.
[ ] Implement core emitter with buffer replay.
[ ] Write starter Jest test suite.
[ ] Draft framework adapters.
[ ] Publish Design Notes Markdown in repo.
[ ] Prepare Contributor Guide.

