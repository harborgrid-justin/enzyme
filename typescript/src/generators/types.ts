/**
 * Type Definition Generator from Schemas
 *
 * Generates TypeScript type definitions from JSON schemas, OpenAPI specs,
 * GraphQL schemas, and other data sources.
 *
 * @example
 * ```typescript
 * const generator = new TypeGenerator();
 * const types = generator.fromJSONSchema({
 *   type: 'object',
 *   properties: {
 *     name: { type: 'string' },
 *     age: { type: 'number' }
 *   }
 * });
 * ```
 *
 * @module generators/types
 */

/**
 * JSON Schema type
 */
export type JSONSchemaType =
  | 'string'
  | 'number'
  | 'integer'
  | 'boolean'
  | 'object'
  | 'array'
  | 'null';

/**
 * JSON Schema definition
 */
export interface JSONSchema {
  type?: JSONSchemaType | JSONSchemaType[];
  properties?: Record<string, JSONSchema>;
  items?: JSONSchema;
  required?: string[];
  enum?: unknown[];
  const?: unknown;
  $ref?: string;
  allOf?: JSONSchema[];
  anyOf?: JSONSchema[];
  oneOf?: JSONSchema[];
  description?: string;
  default?: unknown;
  format?: string;
  pattern?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  additionalProperties?: boolean | JSONSchema;
}

/**
 * Type generation options
 */
export interface TypeGenerationOptions {
  /**
   * Type name
   */
  name?: string;

  /**
   * Make all properties optional
   */
  optional?: boolean;

  /**
   * Make all properties readonly
   */
  readonly?: boolean;

  /**
   * Export the type
   */
  export?: boolean;

  /**
   * Use interface instead of type
   */
  useInterface?: boolean;

  /**
   * Include descriptions as JSDoc
   */
  includeDescriptions?: boolean;

  /**
   * Prefix for generated types
   */
  prefix?: string;

  /**
   * Suffix for generated types
   */
  suffix?: string;
}

/**
 * Type definition result
 */
export interface TypeDefinition {
  /**
   * Type name
   */
  name: string;

  /**
   * Type definition code
   */
  code: string;

  /**
   * Dependent types
   */
  dependencies?: TypeDefinition[];
}

/**
 * TypeScript type generator from various schemas
 *
 * @example
 * ```typescript
 * const generator = new TypeGenerator();
 *
 * // From JSON Schema
 * const userType = generator.fromJSONSchema({
 *   type: 'object',
 *   properties: {
 *     id: { type: 'string' },
 *     name: { type: 'string' },
 *     email: { type: 'string', format: 'email' },
 *     age: { type: 'number', minimum: 0 }
 *   },
 *   required: ['id', 'name', 'email']
 * }, { name: 'User', export: true });
 *
 * // From object example
 * const configType = generator.fromObject({
 *   apiUrl: 'https://api.example.com',
 *   timeout: 5000,
 *   retries: 3,
 *   enabled: true
 * }, { name: 'Config' });
 * ```
 */
export class TypeGenerator {
  private typeCounter = 0;

  /**
   * Generate TypeScript type from JSON Schema
   *
   * @param schema - JSON Schema definition
   * @param options - Generation options
   * @returns Type definition
   *
   * @example
   * ```typescript
   * const type = generator.fromJSONSchema({
   *   type: 'object',
   *   properties: {
   *     title: { type: 'string' },
   *     count: { type: 'number' }
   *   }
   * }, { name: 'Article' });
   * ```
   */
  fromJSONSchema(
    schema: JSONSchema,
    options?: TypeGenerationOptions
  ): TypeDefinition {
    const opts = this.getDefaultOptions(options);
    const name = opts.name || this.generateTypeName();
    const typeStr = this.schemaToTypeString(schema, opts);

    const keyword = opts.useInterface ? 'interface' : 'type';
    const exportKeyword = opts.export ? 'export ' : '';
    const assignment = opts.useInterface ? '' : ' =';

    const description = opts.includeDescriptions && schema.description
      ? `/**\n * ${schema.description}\n */\n`
      : '';

    const code = `${description}${exportKeyword}${keyword} ${name}${assignment} ${typeStr};`;

    return {
      name,
      code,
    };
  }

  /**
   * Generate TypeScript type from a JavaScript object
   *
   * @param obj - JavaScript object
   * @param options - Generation options
   * @returns Type definition
   *
   * @example
   * ```typescript
   * const type = generator.fromObject({
   *   name: 'John',
   *   age: 30,
   *   active: true
   * }, { name: 'Person' });
   * ```
   */
  fromObject(obj: unknown, options?: TypeGenerationOptions): TypeDefinition {
    const schema = this.objectToSchema(obj);
    return this.fromJSONSchema(schema, options);
  }

  /**
   * Generate interface from object properties
   *
   * @param properties - Object properties
   * @param options - Generation options
   * @returns Type definition
   *
   * @example
   * ```typescript
   * const type = generator.generateInterface({
   *   id: 'string',
   *   name: 'string',
   *   age: 'number'
   * }, { name: 'User', export: true });
   * ```
   */
  generateInterface(
    properties: Record<string, string>,
    options?: TypeGenerationOptions
  ): TypeDefinition {
    const opts = this.getDefaultOptions(options);
    const name = opts.name || this.generateTypeName();

    const props = Object.entries(properties).map(([key, type]) => {
      const optional = opts.optional ? '?' : '';
      const readonly = opts.readonly ? 'readonly ' : '';
      return `  ${readonly}${key}${optional}: ${type};`;
    }).join('\n');

    const exportKeyword = opts.export ? 'export ' : '';
    const code = `${exportKeyword}interface ${name} {\n${props}\n}`;

    return {
      name,
      code,
    };
  }

  /**
   * Generate type alias
   *
   * @param name - Type name
   * @param definition - Type definition
   * @param options - Generation options
   * @returns Type definition
   *
   * @example
   * ```typescript
   * const type = generator.generateTypeAlias('UserId', 'string', { export: true });
   * const union = generator.generateTypeAlias('Status', "'active' | 'inactive'");
   * ```
   */
  generateTypeAlias(
    name: string,
    definition: string,
    options?: TypeGenerationOptions
  ): TypeDefinition {
    const opts = this.getDefaultOptions(options);
    const exportKeyword = opts.export ? 'export ' : '';

    const code = `${exportKeyword}type ${name} = ${definition};`;

    return {
      name,
      code,
    };
  }

  /**
   * Generate enum
   *
   * @param name - Enum name
   * @param values - Enum values
   * @param options - Generation options
   * @returns Type definition
   *
   * @example
   * ```typescript
   * const enumDef = generator.generateEnum('Color', ['Red', 'Green', 'Blue']);
   * const numEnum = generator.generateEnum('Priority', { Low: 1, Medium: 2, High: 3 });
   * ```
   */
  generateEnum(
    name: string,
    values: string[] | Record<string, string | number>,
    options?: TypeGenerationOptions
  ): TypeDefinition {
    const opts = this.getDefaultOptions(options);
    const exportKeyword = opts.export ? 'export ' : '';

    let members: string;
    if (Array.isArray(values)) {
      members = values.map(v => `  ${v} = '${v}',`).join('\n');
    } else {
      members = Object.entries(values)
        .map(([key, val]) => {
          const value = typeof val === 'string' ? `'${val}'` : val;
          return `  ${key} = ${value},`;
        })
        .join('\n');
    }

    const code = `${exportKeyword}enum ${name} {\n${members}\n}`;

    return {
      name,
      code,
    };
  }

  /**
   * Generate union type
   *
   * @param name - Type name
   * @param types - Union member types
   * @param options - Generation options
   * @returns Type definition
   *
   * @example
   * ```typescript
   * const union = generator.generateUnion('Result', ['Success', 'Error']);
   * ```
   */
  generateUnion(
    name: string,
    types: string[],
    options?: TypeGenerationOptions
  ): TypeDefinition {
    const definition = types.join(' | ');
    return this.generateTypeAlias(name, definition, options);
  }

  /**
   * Generate utility type
   *
   * @param name - Type name
   * @param utility - Utility type (e.g., 'Partial', 'Required', 'Pick')
   * @param baseType - Base type to apply utility to
   * @param options - Generation options
   * @returns Type definition
   *
   * @example
   * ```typescript
   * const partial = generator.generateUtility('PartialUser', 'Partial', 'User');
   * const pick = generator.generateUtility('UserBasic', 'Pick', 'User, "id" | "name"');
   * ```
   */
  generateUtility(
    name: string,
    utility: string,
    baseType: string,
    options?: TypeGenerationOptions
  ): TypeDefinition {
    const definition = `${utility}<${baseType}>`;
    return this.generateTypeAlias(name, definition, options);
  }

  /**
   * Convert JSON Schema to TypeScript type string
   */
  private schemaToTypeString(
    schema: JSONSchema,
    options: Required<TypeGenerationOptions>
  ): string {
    // Handle $ref
    if (schema.$ref) {
      return schema.$ref.split('/').pop() || 'unknown';
    }

    // Handle allOf
    if (schema.allOf) {
      const types = schema.allOf.map(s => this.schemaToTypeString(s, options));
      return types.join(' & ');
    }

    // Handle anyOf/oneOf
    if (schema.anyOf || schema.oneOf) {
      const schemas = schema.anyOf || schema.oneOf || [];
      const types = schemas.map(s => this.schemaToTypeString(s, options));
      return types.join(' | ');
    }

    // Handle enum
    if (schema.enum) {
      return schema.enum.map(v => typeof v === 'string' ? `'${v}'` : v).join(' | ');
    }

    // Handle const
    if (schema.const !== undefined) {
      return typeof schema.const === 'string' ? `'${schema.const}'` : String(schema.const);
    }

    // Handle array type
    if (Array.isArray(schema.type)) {
      const types = schema.type.map(t => this.primitiveTypeToTS(t));
      return types.join(' | ');
    }

    const type = schema.type || 'object';

    switch (type) {
      case 'object':
        return this.objectSchemaToTypeString(schema, options);

      case 'array':
        if (schema.items) {
          const itemType = this.schemaToTypeString(schema.items, options);
          return `${itemType}[]`;
        }
        return 'unknown[]';

      case 'string':
      case 'number':
      case 'integer':
      case 'boolean':
      case 'null':
        return this.primitiveTypeToTS(type);

      default:
        return 'unknown';
    }
  }

  /**
   * Convert object schema to type string
   */
  private objectSchemaToTypeString(
    schema: JSONSchema,
    options: Required<TypeGenerationOptions>
  ): string {
    if (!schema.properties || Object.keys(schema.properties).length === 0) {
      // Handle additionalProperties
      if (schema.additionalProperties) {
        if (typeof schema.additionalProperties === 'object') {
          const valueType = this.schemaToTypeString(schema.additionalProperties, options);
          return `Record<string, ${valueType}>`;
        }
        return 'Record<string, unknown>';
      }
      return '{}';
    }

    const required = schema.required || [];
    const props = Object.entries(schema.properties).map(([key, propSchema]) => {
      const isRequired = required.includes(key);
      const optional = options.optional || !isRequired ? '?' : '';
      const readonly = options.readonly ? 'readonly ' : '';
      const type = this.schemaToTypeString(propSchema, options);

      const description = options.includeDescriptions && propSchema.description
        ? `\n  /** ${propSchema.description} */`
        : '';

      return `${description}\n  ${readonly}${key}${optional}: ${type};`;
    });

    return `{${props.join('')}\n}`;
  }

  /**
   * Convert primitive type to TypeScript
   */
  private primitiveTypeToTS(type: JSONSchemaType): string {
    switch (type) {
      case 'string':
        return 'string';
      case 'number':
      case 'integer':
        return 'number';
      case 'boolean':
        return 'boolean';
      case 'null':
        return 'null';
      case 'array':
        return 'unknown[]';
      case 'object':
        return 'object';
      default:
        return 'unknown';
    }
  }

  /**
   * Convert JavaScript object to JSON Schema
   */
  private objectToSchema(obj: unknown): JSONSchema {
    if (obj === null) {
      return { type: 'null' };
    }

    if (Array.isArray(obj)) {
      const items = obj.length > 0 ? this.objectToSchema(obj[0]) : { type: 'null' };
      return {
        type: 'array',
        items,
      };
    }

    if (typeof obj === 'object') {
      const properties: Record<string, JSONSchema> = {};
      const required: string[] = [];

      for (const [key, value] of Object.entries(obj)) {
        properties[key] = this.objectToSchema(value);
        required.push(key);
      }

      return {
        type: 'object',
        properties,
        required,
      };
    }

    // Primitive types
    if (typeof obj === 'string') return { type: 'string' };
    if (typeof obj === 'number') return { type: 'number' };
    if (typeof obj === 'boolean') return { type: 'boolean' };

    return { type: 'null' };
  }

  /**
   * Generate a unique type name
   */
  private generateTypeName(): string {
    return `GeneratedType${++this.typeCounter}`;
  }

  /**
   * Get default options
   */
  private getDefaultOptions(options?: TypeGenerationOptions): Required<TypeGenerationOptions> {
    return {
      name: '',
      optional: false,
      readonly: false,
      export: true,
      useInterface: false,
      includeDescriptions: true,
      prefix: '',
      suffix: '',
      ...options,
    };
  }
}

/**
 * Quick function to generate type from JSON Schema
 *
 * @param schema - JSON Schema
 * @param name - Type name
 * @returns TypeScript type definition
 *
 * @example
 * ```typescript
 * const type = fromJSONSchema({
 *   type: 'object',
 *   properties: {
 *     id: { type: 'string' },
 *     count: { type: 'number' }
 *   }
 * }, 'MyType');
 * ```
 */
export function fromJSONSchema(schema: JSONSchema, name: string): string {
  const generator = new TypeGenerator();
  const result = generator.fromJSONSchema(schema, { name, export: true });
  return result.code;
}

/**
 * Quick function to generate type from object
 *
 * @param obj - JavaScript object
 * @param name - Type name
 * @returns TypeScript type definition
 *
 * @example
 * ```typescript
 * const type = fromObject({ x: 1, y: 2 }, 'Point');
 * ```
 */
export function fromObject(obj: unknown, name: string): string {
  const generator = new TypeGenerator();
  const result = generator.fromObject(obj, { name, export: true });
  return result.code;
}

/**
 * Quick function to generate interface
 *
 * @param properties - Interface properties
 * @param name - Interface name
 * @returns TypeScript interface definition
 *
 * @example
 * ```typescript
 * const interface = generateInterface({
 *   id: 'string',
 *   name: 'string',
 *   age: 'number'
 * }, 'User');
 * ```
 */
export function generateInterface(
  properties: Record<string, string>,
  name: string
): string {
  const generator = new TypeGenerator();
  const result = generator.generateInterface(properties, { name, export: true });
  return result.code;
}

/**
 * Common type templates
 */
export const typeTemplates = {
  /**
   * API response wrapper type
   */
  apiResponse: (dataType: string): string => {
    const generator = new TypeGenerator();
    return generator.generateInterface(
      {
        data: dataType,
        success: 'boolean',
        message: 'string',
        error: 'Error | null',
      },
      { name: 'ApiResponse', export: true }
    ).code;
  },

  /**
   * Paginated response type
   */
  paginatedResponse: (itemType: string): string => {
    const generator = new TypeGenerator();
    return generator.generateInterface(
      {
        items: `${itemType}[]`,
        total: 'number',
        page: 'number',
        pageSize: 'number',
        hasMore: 'boolean',
      },
      { name: 'PaginatedResponse', export: true }
    ).code;
  },

  /**
   * Form field type
   */
  formField: (): string => {
    const generator = new TypeGenerator();
    return generator.generateInterface(
      {
        value: 'string',
        error: 'string | null',
        touched: 'boolean',
        dirty: 'boolean',
      },
      { name: 'FormField', export: true }
    ).code;
  },

  /**
   * Async state type
   */
  asyncState: (dataType: string): string => {
    const generator = new TypeGenerator();
    return generator.generateInterface(
      {
        data: `${dataType} | null`,
        loading: 'boolean',
        error: 'Error | null',
      },
      { name: 'AsyncState', export: true }
    ).code;
  },
};
