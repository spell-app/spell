---
title: NetBox's demo, for Spell
folder: ~/netbox-try
fresh until: 04:00 UTC
---

# NetBox's demo, for Spell

Make Spell's NetBox place from NetBox's public demo, and check it reads and writes.
About 10 minutes, in one sitting:  the demo wipes itself every night at 04:00 UTC,
your account and token with it.

Start it with `spell runbook start netbox-demo`.
It runs the commands in `~/netbox-try`, and remembers how far you got until 04:00 UTC.

## Make an account

Open [demo.netbox.dev](https://demo.netbox.dev/plugins/demo/login/).
Leave Username and Password empty, and click **Create & Sign In**.

Should:  NetBox's home page, signed in as `user` and a number, top right.

## Make a token

Click your user name, top right, then **API Tokens**, then **Add a Token**.
Leave everything as it is:  Version v2, Enabled and Write enabled ticked.
Description:  `spell`.  Click **Create**, then copy the whole token.

```ask NETBOX_TOKEN secret
Paste the whole token:  it starts nbt_ and has a dot in the middle
```

## Make the NetBox place

It reads NetBox's schema and writes `NetBox.api.spell`, with its description beside it.
About 20 seconds.

```sh
spell place ingest https://demo.netbox.dev --kind "web server" --spec "https://demo.netbox.dev/api/schema/?format=json" --key-secret NETBOX_TOKEN --name netbox --into NetBox.api.spell --no-examples --no-ai
```

If not:  `the key named NETBOX_TOKEN isn't in the environment` means step 2 didn't keep the token:
start again with `spell runbook reset netbox-demo`.

## Check every list reads

It reads each of NetBox's lists for real, and one thing of each.  About a minute.
One list always fails, `connected_devices`:  NetBox won't list it without two filters (the data epic's I136),
so this step goes on when only some fail.

```sh
spell place verify NetBox.api.spell || echo "Some lists failed:  see What failed, above."
```

<details><summary>Output</summary>

```text
Verified netbox, for NetBox.api.spell.  Its description:  ...
...
```

</details>

If not:  `403: Invalid v2 token` means part of the token was cut off, or it was wiped at 04:00 UTC.
Start again with `spell runbook reset netbox-demo`.

## Try writes

It adds, changes and deletes one row of the first list that reads, and says whether NetBox kept it.
Harmless:  the demo wipes it tonight.

```sh
spell place verify NetBox.api.spell --try-writes || echo "Some writes failed:  see Writes, above."
```

<details><summary>Output</summary>

```text
Verified netbox, for NetBox.api.spell.  Its description:  ...
...
Writes:
...
```

</details>

If not:  `403: Invalid v2 token` means part of the token was cut off, or it was wiped at 04:00 UTC.
Start again with `spell runbook reset netbox-demo`.
