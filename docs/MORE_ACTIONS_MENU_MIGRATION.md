# More Actions Menu — Migration Guidance

Describes the changes made to `due-diligence-assessments-card` to align the "three-dots"
overflow menu with the standard pattern used by `compliance-information-card` and
`partner-leveling-main-card`.

Apply this same set of changes to each card that still uses the old `ActionSheet` pattern.

---

## What changed and why

| Before | After |
|---|---|
| `sap.m.ActionSheet` + `sap.m.Button` items | `sap.m.Menu` + `sap.m.MenuItem` items |
| Fragment named `MoreActionsSheet.fragment.xml` | Fragment named `Menu.fragment.xml` |
| Handler `onMoreActions` | Handler `onMenuPress` |
| Handler `onOpenAbout` | Handler `onWhatIsCardAboutPress` |
| Handler `onAboutClose` | Handler `onCloseWhatIsCardAboutDialog` |
| No "Required Authorization" option | `onRequiredAuthorizationPress` via SDK `AuthorizationDialog` |
| "Refresh Data" option present | Removed (data updates via `NotifyComplianceDataUpdateEvent`) |
| i18n keys `ACTION_*` | i18n keys `MENU_*` |

Menu items (in this order):
1. **What is this card about?** — icon `sap-icon://sys-help` → `onWhatIsCardAboutPress`
2. **Required Authorization** — icon `sap-icon://key` → `onRequiredAuthorizationPress`
3. **Tips** — icon `sap-icon://lightbulb` → `onOpenTips`  *(Tips is specific to this card — skip if the target card has no Tips dialog)*

---

## Files to create

### `src/fragments/Menu.fragment.xml` (new)

```xml
<core:FragmentDefinition
    xmlns="sap.m"
    xmlns:core="sap.ui.core"
>
    <Menu>
        <MenuItem
            text="{i18n>MENU_ABOUT_CARD}"
            icon="sap-icon://sys-help"
            press="onWhatIsCardAboutPress"
        />
        <MenuItem
            text="{i18n>MENU_REQUIRED_AUTH}"
            icon="sap-icon://key"
            press="onRequiredAuthorizationPress"
        />
        <MenuItem
            text="{i18n>MENU_TIPS}"
            icon="sap-icon://lightbulb"
            press="onOpenTips"
        />
    </Menu>
</core:FragmentDefinition>
```

Note: `MENU_TIPS` / `onOpenTips` item is only added if the card has a Tips dialog.
Remove it otherwise. The first two items are mandatory for all cards.

### `src/test/external_libs/.../AuthorizationDialog.controller.js` (new stub)

Path: `src/test/external_libs/com/sap/fiorireuselibrary/ui5cardssdk/AuthorizationDialog.controller.js`

```js
/* istanbul ignore file */
sap.ui.define([], function () {
    "use strict";

    // Stub: AuthorizationDialog.controller is part of the SDK reuse lib.
    // In unit tests it is replaced by this minimal stub so the module can load
    // without a real SDK dependency.
    function AuthorizationDialog(oComponent) {
        this._oComponent = oComponent;
    }
    AuthorizationDialog.prototype.openDialog = function () {};

    return AuthorizationDialog;
});
```

---

## Files to delete

- `src/fragments/MoreActionsSheet.fragment.xml` — no longer referenced, dead code.

---

## Files to modify

### 1. `src/fragments/AboutDialog.fragment.xml`

Replace the entire fragment with the standard pattern (simple `FormattedText`, no form):

```xml
<core:FragmentDefinition
    xmlns="sap.m"
    xmlns:core="sap.ui.core"
>
    <Dialog
        id="aboutDialog"
        title="{i18n>ABOUT_DIALOG_TITLE}"
    >
        <content>
            <VBox class="sapUiSmallMargin">
                <FormattedText
                    class="sapBenchMessageDialogFormattedText"
                    htmlText="{i18n>ABOUT_DIALOG_TEXT}"
                />
            </VBox>
        </content>
        <endButton>
            <Button
                text="{i18n>ABOUT_DIALOG_CLOSE}"
                press=".onCloseWhatIsCardAboutDialog"
            />
        </endButton>
    </Dialog>
</core:FragmentDefinition>
```

> **Note:** `sap.m.Dialog` does NOT have a `footer` aggregation — use `endButton`.
> The CSS class `sapBenchMessageDialogFormattedText` is required for correct rendering of headings.
> `<b>` tags without a block wrapper (`<h5>`) are silently swallowed by `FormattedText`.

### 2. `src/Main.controller.js`

**a) Imports array** — add `AuthorizationDialog.controller`, remove `sap/m/MessageToast`:

```js
sap.ui.define(
    [
        "com/sap/fiorireuselibrary/ui5cardssdk/Base.controller",
        "com/sap/fiorireuselibrary/ui5cardssdk/AuthorizationDialog.controller",  // ADD
        "sap/ui/core/Fragment",
        // "sap/m/MessageToast"  ← REMOVE
        ...
    ],
    function (BaseController, AuthorizationDialog, Fragment, ...) {
```

**b) Replace `onMoreActions` with `onMenuPress`:**

```js
onMenuPress: function (oEvent) {
    const oButton = oEvent.getSource();
    const that = this;

    if (!this._pMenu) {
        this._pMenu = Fragment.load({
            id: this.getView().getId(),
            name: "<card.namespace>.fragments.Menu",
            controller: this
        })
            .then(function (oMenu) {
                that.getView().addDependent(oMenu);
                return oMenu;
            })
            .catch(function (oError) {
                that._pMenu = null;
                that._oErrorHandler.handleErrorEvent(oError);
                throw oError;
            });
    }

    this._pMenu
        .then(function (oMenu) {
            oMenu.openBy(oButton);
        })
        .catch(function (oError) {
            that._oErrorHandler.handleErrorEvent(oError);
        });
},
```

**c) Rename `onOpenAbout` → `onWhatIsCardAboutPress`, `onAboutClose` → `onCloseWhatIsCardAboutDialog`:**

```js
onWhatIsCardAboutPress: function () {
    // ... same lazy-load Fragment.load pattern as before,
    // loading "...fragments.AboutDialog"
},

onCloseWhatIsCardAboutDialog: function () {
    this.byId("aboutDialog").close();
},
```

**d) Add `onRequiredAuthorizationPress` (new method):**

```js
onRequiredAuthorizationPress: function () {
    const oAuthDialog = new AuthorizationDialog(this.getOwnerComponent());
    oAuthDialog.openDialog();
},
```

**e) Remove `onRefreshData` entirely** (if present):

```js
// DELETE this method and its comment block:
onRefreshData: function () {
    this._loadData();
    MessageToast.show(this._oResourceBundle.getText("MSG_DATA_REFRESHED"));
},
```

### 3. `src/View.view.xml`

Change the overflow button binding:

```xml
<!-- before -->
press=".onMoreActions"
<!-- after -->
press=".onMenuPress"
```

### 4. `src/i18n/i18n.properties`

**Replace** old About dialog keys with new single-text pattern:
```properties
# --- About Dialog ---
ABOUT_DIALOG_TITLE=About This Card
ABOUT_DIALOG_CLOSE=Close
ABOUT_DIALOG_TEXT=<h5><strong>Overview</strong></h5><ul><li>...</li></ul><br><h5><strong>Details</strong></h5><ul><li>...</li></ul><br>
```

> **HTML structure:** headings must use `<h5><strong>` — plain `<b>` or `<p><b>` are not
> rendered visibly by `sap.m.FormattedText`. Reference card with working example:
> `content/CompetencyEngine/partner-competency-spec-main-table/src/i18n/i18n.properties` (key `WHAT_IS_CARD_ABOUT`).

**Remove** old action sheet keys:
```
ACTION_REFRESH=Refresh Data      ← remove
ACTION_TIPS=Tips                 ← remove (or rename)
ACTION_ABOUT=About This Card     ← remove (or rename)
MSG_DATA_REFRESHED=Data refreshed ← remove
```

**Add** new menu keys and SDK authorization dialog keys:
```properties
# --- Menu ---
MENU_ABOUT_CARD=What is this card about?
MENU_REQUIRED_AUTH=Required Authorization
MENU_TIPS=Tips

# --- Required Authorization dialog (loaded by AuthorizationDialog SDK controller) ---
# REQUIRED_AUTH_ROLE: use <p> wrapper for centering, <strong> for bold (plain <b> is stripped)
REQUIRED_AUTHORIZATION_TITLE=Required Authorizations
REQUIRED_AUTH_ROLE=<p>SAP Employee role - <strong>00:PM_EMP:GP</strong> in PWP system</p>
CLOSE=Close
GO_TO_SERVICE=Go to Service
```

> **Note:** `CLOSE` is required by the SDK dialog — check whether the card already has
> a `CLOSE` key (vs `BTN_CLOSE`). If there is a conflict, the SDK key takes precedence.

### 5. `src/css/style.css`

Add centering rule. Scoped to `<p>` only — About dialog uses `<h5>`/`<ul>` and is not affected:

```css
/* Center text in Required Authorization dialog.
   Scoped to <p> only — About dialog uses <h5>/<ul> and stays left-aligned. */
.sapBenchMessageDialogFormattedText p {
    text-align: center;
    margin: 0;
}
```

---

## Checklist

- [ ] `Menu.fragment.xml` created
- [ ] `MoreActionsSheet.fragment.xml` deleted
- [ ] `AboutDialog.fragment.xml` — полностью заменён на `FormattedText`-паттерн (не только обработчик)
- [ ] `AuthorizationDialog.controller.js` stub created in `test/external_libs/`
- [ ] Controller — `AuthorizationDialog` imported
- [ ] Controller — `MessageToast` import removed (if was there only for Refresh)
- [ ] Controller — `onMoreActions` → `onMenuPress` (variable `_pMoreSheet` → `_pMenu`)
- [ ] Controller — `onOpenAbout` → `onWhatIsCardAboutPress`
- [ ] Controller — `onAboutClose` → `onCloseWhatIsCardAboutDialog`
- [ ] Controller — `onRequiredAuthorizationPress` added
- [ ] Controller — `onRefreshData` removed (if present)
- [ ] View — `press=".onMenuPress"`
- [ ] i18n — старые `ABOUT_TITLE/DESCRIPTION/VERSION/OWNER/CONTACT/CARD_*` убраны, добавлены `ABOUT_DIALOG_TEXT` + `ABOUT_DIALOG_CLOSE` + `MENU_*` + SDK auth keys
- [ ] `src/css/style.css` — добавлен блок `.sapBenchMessageDialogFormattedText p`
- [ ] Tests run clean

---

## Reference implementation

`content/Compliance/due-diligence-assessments-card/` — fully migrated on branch `ITBENCH-18`.
`content/Compliance/compliance-information-card/` — original menu pattern source (no Tips item).
`content/CompetencyEngine/partner-competency-spec-main-table/` — reference for `FormattedText` HTML structure (`<h5><strong>` headings, `sapBenchMessageDialogFormattedText` class).
