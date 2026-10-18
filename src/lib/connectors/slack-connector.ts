/**
 * Slack Export JSON Connector
 * Parses standard Slack export files: channels.json and message threads.
 * Maps Slack channels, users, messages, mentions, and discussion threads into graph nodes.
 */

export type SlackChannel = {
  id: string;
  name: string;
  topic?: { value: string };
  purpose?: { value: string };
};

export type SlackMessage = {
  type: string;
  user: string;
  text: string;
  ts: string;
  thread_ts?: string;
  reply_count?: number;
};

export function parseSlackExport(
  channel: SlackChannel,
  messages: SlackMessage[]
): {
  nodes: Array<{ id: string; label: string; name: string; properties: Record<string, unknown> }>;
  edges: Array<{ from: string; to: string; rel: string; properties?: Record<string, unknown> }>;
} {
  const nodes: Array<{ id: string; label: string; name: string; properties: Record<string, unknown> }> = [];
  const edges: Array<{ from: string; to: string; rel: string; properties?: Record<string, unknown> }> = [];

  const channelId = `slack-chan-${channel.id}`;
  nodes.push({
    id: channelId,
    label: "Channel",
    name: `#${channel.name}`,
    properties: {
      id: channelId,
      channelId: channel.id,
      name: channel.name,
      topic: channel.topic?.value,
      source: "slack_export",
    },
  });

  for (const msg of messages) {
    const msgId = `slack-msg-${msg.ts.replace(".", "-")}`;
    const date = new Date(Number(msg.ts.split(".")[0]) * 1000).toISOString();

    nodes.push({
      id: msgId,
      label: "Message",
      name: `Slack in #${channel.name}`,
      properties: {
        id: msgId,
        text: msg.text,
        timestamp: date,
        authorSlackId: msg.user,
        source: "slack_export",
      },
    });

    edges.push({
      from: msgId,
      to: channelId,
      rel: "POSTED_IN",
    });

    // Author Person node
    const personId = `person-slack-${msg.user.toLowerCase()}`;
    nodes.push({
      id: personId,
      label: "Person",
      name: `User ${msg.user}`,
      properties: { id: personId, slackId: msg.user },
    });

    edges.push({
      from: personId,
      to: msgId,
      rel: "SENT",
    });

    // Extract @mentions (<@U12345>)
    const mentionMatches = msg.text.match(/<@([A-Z0-9]+)>/g) || [];
    for (const m of mentionMatches) {
      const mentionedUserId = m.replace(/[<@>]/g, "");
      const targetPersonId = `person-slack-${mentionedUserId.toLowerCase()}`;
      nodes.push({
        id: targetPersonId,
        label: "Person",
        name: `User ${mentionedUserId}`,
        properties: { id: targetPersonId, slackId: mentionedUserId },
      });
      edges.push({
        from: msgId,
        to: targetPersonId,
        rel: "MENTIONS",
      });
    }
  }

  return { nodes, edges };
}
