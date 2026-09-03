# EduSphere — Security & Compliance Architecture

## Security Principles
1. **Zero Committed Secrets**: No live credentials, API keys, or production certificates in git.
2. **Server-Side Authorization**: Every protected API route enforces strict server-side role validation.
3. **Safe Demo Data**: All names, addresses, contacts, and student records are 100% fictional.
4. **Audit Logging**: Immutable action logging for all admissions, marks entry, and fee transactions.
5. **No Payment Card Storage**: Uses simulated sandbox payment flows without storing sensitive PCI data.
