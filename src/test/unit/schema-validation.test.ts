/**
 * Schema Validation System Tests
 * Comprehensive tests for runtime schema validation
 * @author The Base Event Team
 * @since 1.0.0
 */

import {
  validate,
  isValid,
  validateEventData,
  createSchemaRegistry,
  getGlobalRegistry,
  createSchemaValidator,
  SchemaValidationError,
  type Schema,
  type SchemaDefinition,
  type ValidationResult,
} from "../../core/events/schemas";

describe("Schema Validation Core", () => {
  describe("String Validation", () => {
    it("should validate string type", () => {
      const schema: Schema = { type: "string" };

      expect(isValid("hello", schema)).toBe(true);
      expect(isValid(123, schema)).toBe(false);
      expect(isValid(null, schema)).toBe(false);
    });

    it("should validate string with minLength", () => {
      const schema: Schema = { type: "string", minLength: 3 };

      expect(isValid("abc", schema)).toBe(true);
      expect(isValid("ab", schema)).toBe(false);
    });

    it("should validate string with maxLength", () => {
      const schema: Schema = { type: "string", maxLength: 5 };

      expect(isValid("hello", schema)).toBe(true);
      expect(isValid("hello world", schema)).toBe(false);
    });

    it("should validate string with pattern", () => {
      const schema: Schema = { type: "string", pattern: /^[a-z]+$/ };

      expect(isValid("hello", schema)).toBe(true);
      expect(isValid("Hello", schema)).toBe(false);
      expect(isValid("hello123", schema)).toBe(false);
    });

    it("should validate string enum", () => {
      const schema: Schema = { type: "string", enum: ["red", "green", "blue"] };

      expect(isValid("red", schema)).toBe(true);
      expect(isValid("yellow", schema)).toBe(false);
    });

    it("should validate optional string", () => {
      const schema: Schema = { type: "string", optional: true };

      expect(isValid("hello", schema)).toBe(true);
      expect(isValid(undefined, schema)).toBe(true);
      expect(isValid(null, schema)).toBe(true);
    });
  });

  describe("Number Validation", () => {
    it("should validate number type", () => {
      const schema: Schema = { type: "number" };

      expect(isValid(42, schema)).toBe(true);
      expect(isValid("42", schema)).toBe(false);
    });

    it("should validate number with minimum", () => {
      const schema: Schema = { type: "number", minimum: 0 };

      expect(isValid(0, schema)).toBe(true);
      expect(isValid(-1, schema)).toBe(false);
    });

    it("should validate number with maximum", () => {
      const schema: Schema = { type: "number", maximum: 100 };

      expect(isValid(100, schema)).toBe(true);
      expect(isValid(101, schema)).toBe(false);
    });

    it("should validate integer", () => {
      const schema: Schema = { type: "number", integer: true };

      expect(isValid(42, schema)).toBe(true);
      expect(isValid(3.14, schema)).toBe(false);
    });

    it("should validate number enum", () => {
      const schema: Schema = { type: "number", enum: [1, 2, 3] };

      expect(isValid(2, schema)).toBe(true);
      expect(isValid(4, schema)).toBe(false);
    });
  });

  describe("Boolean Validation", () => {
    it("should validate boolean type", () => {
      const schema: Schema = { type: "boolean" };

      expect(isValid(true, schema)).toBe(true);
      expect(isValid(false, schema)).toBe(true);
      expect(isValid("true", schema)).toBe(false);
      expect(isValid(1, schema)).toBe(false);
    });

    it("should validate optional boolean", () => {
      const schema: Schema = { type: "boolean", optional: true };

      expect(isValid(undefined, schema)).toBe(true);
    });
  });

  describe("Object Validation", () => {
    it("should validate object type", () => {
      const schema: Schema = { type: "object", properties: {} };

      expect(isValid({ foo: "bar" }, schema)).toBe(true);
      expect(isValid({ foo: "bar" } as unknown, schema)).toBe(true);
      expect(isValid("not an object", schema)).toBe(false);
      expect(isValid(null, schema)).toBe(false);
      expect(isValid([1, 2, 3], schema)).toBe(false);
    });

    it("should validate required fields", () => {
      const schema: Schema = {
        type: "object",
        properties: {
          name: { type: "string" },
          age: { type: "number" },
        },
        required: ["name"],
      };

      expect(isValid({ name: "John" }, schema)).toBe(true);
      expect(isValid({ name: "John", age: 30 }, schema)).toBe(true);
      expect(isValid({ age: 30 }, schema)).toBe(false);
    });

    it("should validate nested object properties", () => {
      const schema: Schema = {
        type: "object",
        properties: {
          user: {
            type: "object",
            properties: {
              name: { type: "string" },
            },
            required: ["name"],
          },
        },
        required: ["user"],
      };

      expect(isValid({ user: { name: "John" } }, schema)).toBe(true);
      expect(isValid({ user: { name: 123 } }, schema)).toBe(false);
      expect(isValid({ user: {} }, schema)).toBe(false);
    });

    it("should validate additionalProperties=false", () => {
      const schema: Schema = {
        type: "object",
        properties: {
          name: { type: "string" },
        },
        additionalProperties: false,
      };

      expect(isValid({ name: "John" }, schema)).toBe(true);
      expect(isValid({ name: "John", age: 30 }, schema)).toBe(false);
    });

    it("should allow additional properties when not specified", () => {
      const schema: Schema = {
        type: "object",
        properties: {
          name: { type: "string" },
        },
      };

      expect(isValid({ name: "John", extra: "value" }, schema)).toBe(true);
    });
  });

  describe("Array Validation", () => {
    it("should validate array type", () => {
      const schema: Schema = { type: "array", items: { type: "string" } };

      expect(isValid(["a", "b"], schema)).toBe(true);
      expect(isValid([], schema)).toBe(true);
      expect(isValid("not an array", schema)).toBe(false);
    });

    it("should validate array items", () => {
      const schema: Schema = { type: "array", items: { type: "number" } };

      expect(isValid([1, 2, 3], schema)).toBe(true);
      expect(isValid([1, "2", 3], schema)).toBe(false);
    });

    it("should validate array with minItems", () => {
      const schema: Schema = {
        type: "array",
        items: { type: "string" },
        minItems: 2,
      };

      expect(isValid(["a", "b"], schema)).toBe(true);
      expect(isValid(["a"], schema)).toBe(false);
    });

    it("should validate array with maxItems", () => {
      const schema: Schema = {
        type: "array",
        items: { type: "string" },
        maxItems: 2,
      };

      expect(isValid(["a", "b"], schema)).toBe(true);
      expect(isValid(["a", "b", "c"], schema)).toBe(false);
    });

    it("should validate nested arrays", () => {
      const schema: Schema = {
        type: "array",
        items: {
          type: "array",
          items: { type: "number" },
        },
      };

      expect(
        isValid(
          [
            [1, 2],
            [3, 4],
          ],
          schema
        )
      ).toBe(true);
      expect(isValid([[1, 2], ["a"]], schema)).toBe(false);
    });
  });

  describe("Enum Validation", () => {
    it("should validate string enum", () => {
      const schema: Schema = { type: "enum", values: ["a", "b", "c"] };

      expect(isValid("a", schema)).toBe(true);
      expect(isValid("d", schema)).toBe(false);
    });

    it("should validate number enum", () => {
      const schema: Schema = { type: "enum", values: [1, 2, 3] };

      expect(isValid(2, schema)).toBe(true);
      expect(isValid(4, schema)).toBe(false);
    });
  });

  describe("Union Validation", () => {
    it("should validate union of types", () => {
      const schema: Schema = {
        type: "union",
        schemas: [{ type: "string" }, { type: "number" }],
      };

      expect(isValid("hello", schema)).toBe(true);
      expect(isValid(42, schema)).toBe(true);
      expect(isValid(true, schema)).toBe(false);
    });
  });

  describe("Literal Validation", () => {
    it("should validate literal string", () => {
      const schema: Schema = { type: "literal", value: "active" };

      expect(isValid("active", schema)).toBe(true);
      expect(isValid("inactive", schema)).toBe(false);
    });

    it("should validate literal number", () => {
      const schema: Schema = { type: "literal", value: 42 };

      expect(isValid(42, schema)).toBe(true);
      expect(isValid(43, schema)).toBe(false);
    });

    it("should validate literal boolean", () => {
      const schema: Schema = { type: "literal", value: true };

      expect(isValid(true, schema)).toBe(true);
      expect(isValid(false, schema)).toBe(false);
    });
  });

  describe("Validation Result", () => {
    it("should return detailed errors", () => {
      const schema: Schema = {
        type: "object",
        properties: {
          name: { type: "string", minLength: 2 },
          age: { type: "number", minimum: 0 },
        },
        required: ["name", "age"],
      };

      const result = validate({ name: "J", age: -5 }, schema);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(2);
      expect(result.errors[0].path).toBe(".name");
      expect(result.errors[0].message).toContain("at least");
    });

    it("should return valid result for valid data", () => {
      const schema: Schema = { type: "string" };
      const result = validate("hello", schema);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});

describe("Schema Registry", () => {
  let registry: ReturnType<typeof createSchemaRegistry>;

  beforeEach(() => {
    registry = createSchemaRegistry();
  });

  it("should register and retrieve schemas", () => {
    const schema: Schema = { type: "string" };
    const definition: SchemaDefinition = {
      channel: "user:name",
      schema,
    };

    registry.register(definition);

    expect(registry.get("user:name")).toEqual(schema);
  });

  it("should check if schema exists", () => {
    const schema: Schema = { type: "string" };

    expect(registry.has("test:channel")).toBe(false);

    registry.register({ channel: "test:channel", schema });

    expect(registry.has("test:channel")).toBe(true);
  });

  it("should remove schemas", () => {
    const schema: Schema = { type: "string" };
    registry.register({ channel: "test:channel", schema });

    expect(registry.remove("test:channel")).toBe(true);
    expect(registry.get("test:channel")).toBeUndefined();
  });

  it("should clear all schemas", () => {
    registry.register({ channel: "a", schema: { type: "string" } });
    registry.register({ channel: "b", schema: { type: "number" } });

    registry.clear();

    expect(registry.has("a")).toBe(false);
    expect(registry.has("b")).toBe(false);
  });
});

describe("Schema Validator Factory", () => {
  it("should create a reusable validator function", () => {
    const schema: Schema = { type: "string", minLength: 3 };
    const validator = createSchemaValidator<string>(schema);

    expect(validator("abc").valid).toBe(true);
    expect(validator("ab").valid).toBe(false);
  });
});

describe("SchemaValidationError", () => {
  it("should create error with channel and errors", () => {
    const error = new SchemaValidationError("test:channel", [
      {
        path: "name",
        message: "Required",
        value: undefined,
        rule: { type: "string" },
      },
    ]);

    expect(error.channel).toBe("test:channel");
    expect(error.errors).toHaveLength(1);
    expect(error.message).toContain("test:channel");
  });
});

describe("Integration with Event Payloads", () => {
  it("should validate user event payload", () => {
    const userEventSchema: Schema = {
      type: "object",
      properties: {
        userId: { type: "string" },
        sessionId: { type: "string", optional: true },
        timestamp: { type: "number" },
        metadata: { type: "object", properties: {}, optional: true },
      },
      required: ["userId", "timestamp"],
    };

    const validPayload = {
      userId: "user-123",
      sessionId: "sess-456",
      timestamp: Date.now(),
    };

    expect(isValid(validPayload, userEventSchema)).toBe(true);

    const invalidPayload = {
      sessionId: "sess-456",
    };

    expect(isValid(invalidPayload, userEventSchema)).toBe(false);
  });

  it("should validate system event payload", () => {
    const systemEventSchema: Schema = {
      type: "object",
      properties: {
        level: { type: "string", enum: ["info", "warn", "error", "debug"] },
        message: { type: "string", minLength: 1 },
        code: { type: "string", optional: true },
        timestamp: { type: "number" },
        context: { type: "object", properties: {}, optional: true },
      },
      required: ["level", "message", "timestamp"],
    };

    const validPayload = {
      level: "error",
      message: "Something went wrong",
      timestamp: Date.now(),
    };

    expect(isValid(validPayload, systemEventSchema)).toBe(true);

    const invalidPayload = {
      level: "invalid-level",
      message: "Error",
      timestamp: Date.now(),
    };

    expect(isValid(invalidPayload, systemEventSchema)).toBe(false);
  });
});

describe("Edge Cases", () => {
  it("should handle null input gracefully", () => {
    const schema: Schema = { type: "string" };

    expect(isValid(null, schema)).toBe(false);
    expect(validate(null, schema).errors[0].message).toContain("null");
  });

  it("should handle undefined input for required fields", () => {
    const schema: Schema = { type: "string" };

    expect(isValid(undefined, schema)).toBe(false);
  });

  it("should handle empty object", () => {
    const schema: Schema = { type: "object", properties: {} };

    expect(isValid({}, schema)).toBe(true);
  });

  it("should handle empty array", () => {
    const schema: Schema = { type: "array", items: { type: "string" } };

    expect(isValid([], schema)).toBe(true);
  });

  it("should handle deeply nested validation", () => {
    const schema: Schema = {
      type: "object",
      properties: {
        level1: {
          type: "object",
          properties: {
            level2: {
              type: "object",
              properties: {
                value: { type: "string" },
              },
              required: ["value"],
            },
          },
          required: ["level2"],
        },
      },
      required: ["level1"],
    };

    expect(isValid({ level1: { level2: { value: "test" } } }, schema)).toBe(
      true
    );
    expect(isValid({ level1: { level2: {} } }, schema)).toBe(false);
  });
});
