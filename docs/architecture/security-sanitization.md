# Security - XSS Prevention (Sanitization)

The sanitization module provides configurable input sanitization to prevent Cross-Site Scripting (XSS) attacks in event payloads.

## Features

- Strip script and style tags
- Remove event handler attributes (onclick, onerror, etc.)
- Encode HTML entities
- Configurable allowed attributes
- Support for deep object sanitization

## Configuration

```typescript
interface SanitizationConfig {
  stripScriptTags: boolean;      // Remove <script> tags (default: true)
  stripStyleTags: boolean;       // Remove <style> tags (default: true)
  stripHtmlTags: boolean;        // Remove HTML tags (default: false)
  stripEventHandlers: boolean;  // Remove event handlers (default: true)
  allowAttributes: string[];     // Allowed tag attributes (default: href, src, alt, title, class, id)
  encodeHtmlEntities: boolean;   // Encode HTML entities (default: true)
}
```

## Usage

### Basic Sanitization

```typescript
import { sanitizeString, sanitizeObject } from "@the-base-event/core";

const dirty = '<script>alert("xss")</script>Hello';
const clean = sanitizeString(dirty);
// Result: "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;Hello"
```

### Object Sanitization

```typescript
const data = {
  name: '<script>alert(1)</script>',
  bio: '<img src=x onerror="alert(1)">',
  age: 25
};

const sanitized = sanitizeObject(data);
// Recursively sanitizes all string values
```

### Custom Configuration

```typescript
const sanitizer = createSanitizer({
  stripScriptTags: true,
  stripStyleTags: true,
  stripEventHandlers: true,
  encodeHtmlEntities: true,
  allowAttributes: ["href", "class"]
});

const result = sanitizer('<a href="http://example.com" onclick="evil()">Link</a>');
// Keeps href, removes onclick
```

### XSS Detection

```typescript
import { isXssPayload } from "@the-base-event/core";

isXssPayload('<script>alert(1)</script>');  // true
isXssPayload('<img src=x onerror="alert(1)">'); // true
isXssPayload('Hello World');  // false
```

### Channel Validation

```typescript
import { sanitizeChannel } from "@the-base-event/core";

// Whitelist mode
sanitizeChannel("user:login", ["user:*", "system:*"]); // true
sanitizeChannel("admin:delete", ["user:*"]); // false

// Blacklist mode
sanitizeChannel("safe:channel", undefined, ["admin:*"]); // true
sanitizeChannel("admin:delete", undefined, ["admin:*"]); // false
```

## Security Patterns

### Default Configuration (Secure)

```typescript
const config = {
  stripScriptTags: true,      // ✓ Always recommended
  stripStyleTags: true,       // ✓ Always recommended
  stripEventHandlers: true,   // ✓ Always recommended
  encodeHtmlEntities: true   // ✓ Always recommended
};
```

### Permissive Configuration (Use with Caution)

```typescript
const config = {
  stripScriptTags: true,
  stripStyleTags: true,
  stripHtmlTags: false,
  stripEventHandlers: true,
  allowAttributes: ["href", "src", "alt", "title", "class", "id"],
  encodeHtmlEntities: false
};
```

## Integration with EventEmitter

```typescript
import { EventEmitter, createSecurityModule } from "@the-base-event/core";

const security = createSecurityModule({
  enabled: true,
  sanitization: {
    enabled: true,
    config: { encodeHtmlEntities: true }
  }
});

const emitter = new EventEmitter();
emitter.use(security.createMiddleware());

// All emitted data will be sanitized
emitter.emit("user:message", { 
  content: '<script>alert("xss")</script>' 
});
```

## XSS Attack Vectors Blocked

- `<script>` tag injection
- `<img>` onerror/onload handlers
- `<svg>` onload handlers
- `<body>` onload handlers
- `javascript:` protocol in URLs
- Event handler attributes (onclick, onmouseover, etc.)
- HTML entity encoding for display safety
