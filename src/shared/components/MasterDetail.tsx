import { type ReactNode } from 'react'

/**
 * iPad mail-style master–detail layout, driven by a CONTAINER query (not the
 * viewport) so it does the right thing in iPad Split View / Slide Over where
 * the app runs at an arbitrary width:
 *
 *   container ≥ 720px → split: list (left) + detail (right), list stays visible
 *   container < 720px → stacked: detail replaces the list when something is
 *                       selected, with a back affordance owned by the caller
 *
 * The selected id lives in the caller's state, so it survives rotation and the
 * split⇄stacked reflow (Part 6). The detail reads from the same data the list
 * already has — no second fetch (Part 6, req 6).
 *
 * Usage:
 *   <MasterDetail
 *     hasSelection={!!selected}
 *     list={<List onSelect={setSelected} selectedId={selected?.id} />}
 *     detail={selected ? <Detail item={selected} onBack={() => setSelected(null)} /> : <Empty />}
 *   />
 */

interface MasterDetailProps {
  /** Compact list shown in the split's left pane. */
  list: ReactNode
  detail: ReactNode
  /** Whether an item is currently selected (drives the stacked fallback). */
  hasSelection: boolean
  /**
   * Optional content for the stacked (narrow) view when nothing is selected —
   * e.g. a multi-column card grid for density. Defaults to `list`.
   */
  stackList?: ReactNode
  /** Left pane share on wide screens (default 40%). */
  listWidth?: string
  className?: string
}

export function MasterDetail({
  list, detail, hasSelection, stackList, listWidth = '40%', className,
}: MasterDetailProps) {
  return (
    <div className={`md-root ${className ?? ''}`}>
      {/* Split view (container ≥ 720px). Both panes render; the list keeps its
          scroll position while the detail updates beside it. */}
      <div className="md-split">
        <div className="md-pane md-list" style={{ flexBasis: listWidth }}>
          {list}
        </div>
        <div className="md-pane md-detail">{detail}</div>
      </div>

      {/* Stacked view (container < 720px): detail if selected, else the grid. */}
      <div className="md-stack">{hasSelection ? detail : (stackList ?? list)}</div>
    </div>
  )
}
