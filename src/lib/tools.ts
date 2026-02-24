export interface ToolDeclaration {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, { type: string; description?: string }>;
    required?: string[];
  };
}

export const demoTools: ToolDeclaration[] = [
  {
    name: "get_current_time",
    description:
      "Get the current time and date. Use when the user asks what time it is or the current date.",
    parameters: {
      type: "OBJECT",
      properties: {
        timezone: {
          type: "STRING",
          description:
            'IANA timezone string, e.g. "America/New_York". Defaults to UTC.',
        },
      },
    },
  },
  {
    name: "get_weather",
    description:
      "Get the current weather for a location. Use when the user asks about weather conditions.",
    parameters: {
      type: "OBJECT",
      properties: {
        location: {
          type: "STRING",
          description: 'City name, e.g. "San Francisco"',
        },
      },
      required: ["location"],
    },
  },
  {
    name: "roll_dice",
    description:
      "Roll one or more dice. Use when the user asks to roll dice or needs a random number.",
    parameters: {
      type: "OBJECT",
      properties: {
        sides: {
          type: "NUMBER",
          description: "Number of sides on each die. Defaults to 6.",
        },
        count: {
          type: "NUMBER",
          description: "Number of dice to roll. Defaults to 1.",
        },
      },
    },
  },
];

export function executeTool(
  name: string,
  args: Record<string, unknown>
): Record<string, unknown> {
  switch (name) {
    case "get_current_time": {
      const tz = (args.timezone as string) || "UTC";
      const now = new Date();
      try {
        const formatted = now.toLocaleString("en-US", {
          timeZone: tz,
          dateStyle: "full",
          timeStyle: "long",
        });
        return { time: formatted, timezone: tz };
      } catch {
        return { time: now.toISOString(), timezone: "UTC" };
      }
    }

    case "get_weather": {
      const location = (args.location as string) || "Unknown";
      const conditions = [
        "Sunny",
        "Partly Cloudy",
        "Overcast",
        "Light Rain",
        "Clear",
      ];
      const condition =
        conditions[Math.floor(Math.random() * conditions.length)];
      const temp = Math.floor(Math.random() * 30) + 5;
      return {
        location,
        temperature_celsius: temp,
        temperature_fahrenheit: Math.round(temp * 1.8 + 32),
        condition,
        humidity: Math.floor(Math.random() * 60) + 30 + "%",
        note: "This is simulated weather data for demo purposes.",
      };
    }

    case "roll_dice": {
      const sides = Math.max(1, Math.floor((args.sides as number) || 6));
      const count = Math.max(1, Math.min(100, Math.floor((args.count as number) || 1)));
      const rolls = Array.from(
        { length: count },
        () => Math.floor(Math.random() * sides) + 1
      );
      return {
        rolls,
        total: rolls.reduce((a, b) => a + b, 0),
        sides,
        count,
      };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}
