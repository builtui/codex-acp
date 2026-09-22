# AIR diff patch extension

Status: Experimental

This extension lets an ACP agent send one compact Git patch instead of file text snapshots.
It applies to an ACP `diff` content block.

## Capability negotiation

The client advertises `diffPatch` in the initialize request:

```json
{
  "clientCapabilities": {
    "_meta": {
      "jetbrains": {
        "air": {
          "version": 1,
          "capabilities": ["diffPatch"]
        }
      }
    }
  }
}
```

The adapter advertises the same capability in the initialize response:

```json
{
  "_meta": {
    "jetbrains": {
      "air": {
        "version": 1,
        "capabilities": ["diffPatch"]
      }
    }
  }
}
```

The adapter uses patch mode only when both peers advertise `diffPatch` with an AIR envelope version of at least 1.
If either declaration is absent or malformed, the adapter sends the standard `oldText` and `newText` values.

## Diff content

Patch mode puts the payload at `_meta.jetbrains.air.diffPatch`:

```json
{
  "type": "diff",
  "path": "/workspace/src/App.ts",
  "oldText": null,
  "newText": "",
  "_meta": {
    "kind": "update",
    "jetbrains": {
      "air": {
        "version": 1,
        "diffPatch": {
          "version": 1,
          "format": "git_patch",
          "text": "diff --git a/workspace/src/App.ts b/workspace/src/App.ts\n--- a/workspace/src/App.ts\n+++ b/workspace/src/App.ts\n@@ -1 +1 @@\n-old\n+new\n"
        }
      }
    }
  }
}
```

| Field | Type | Meaning |
| --- | --- | --- |
| `version` | integer | Must equal `1`. |
| `format` | string | Must equal `git_patch`. |
| `text` | string | One unified Git patch for the block's file. |

The patch contains file headers and at least one `@@` hunk.
An added file uses `/dev/null` as the old file header.
A deleted file uses `/dev/null` as the new file header.

In patch mode, `oldText: null` and `newText: ""` are compatibility placeholders.
They are not file snapshots or changed fragments.
The receiver must use `diffPatch.text` as the change payload after it accepts the negotiated extension.

The receiver derives line counts and changed fragments from the patch.

## Compatibility and fallback

The adapter sends the standard ACP diff when it cannot build a valid patch.
That fallback contains meaningful `oldText` and `newText` values and omits `diffPatch`.

A receiver accepts the patch only after bilateral negotiation.
It also validates both versions, the format, and the patch text.
If validation fails, the receiver ignores `diffPatch` and reads the standard text fields.
Unknown fields do not invalidate a valid payload.

## Codex behavior

Codex App Server supplies compact hunks for updates and file content for additions and deletions.
The adapter adds Git headers to update hunks.
It builds one full-file patch for an addition or deletion because the provider already supplied that content.

The adapter applies this mode to live file changes and replayed session history.
It does not read the current file when it can forward a provider patch.
