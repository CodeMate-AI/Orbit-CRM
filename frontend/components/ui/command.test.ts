import test from "node:test"
import assert from "node:assert/strict"
import * as React from "react"

import {
  CommandDialog,
  CommandInput,
  CommandItem,
} from "./command"

function flattenClassName(node: any): string {
  if (!node || typeof node !== "object") return ""
  const props = node.props ?? {}
  return typeof props.className === "string" ? props.className : ""
}

test("CommandDialog uses the wider Orbit search palette shell", () => {
  const element = CommandDialog({
    open: true,
    onOpenChange() {},
    children: React.createElement("div", null, "child"),
  }) as any

  const dialogContent = element.props.children[1]
  const contentClassName = flattenClassName(dialogContent)

  assert.ok(contentClassName.includes("sm:max-w-[550px]"))
  assert.ok(contentClassName.includes("backdrop-blur-md"))
  assert.ok(contentClassName.includes("bg-bg-secondary/95"))
})

test("CommandInput reserves room for a close button and renders one on the right", () => {
  const element = CommandInput({ placeholder: "Search..." }) as any
  const wrapperClassName = flattenClassName(element)
  const [searchIcon, input, closeButtonWrapper] = element.props.children

  assert.ok(wrapperClassName.includes("border-b"))
  assert.ok(wrapperClassName.includes("px-4"))
  assert.equal(searchIcon.props.className.includes("mr-3"), true)
  assert.equal(searchIcon.props.className.includes("text-text-secondary"), true)
  assert.equal(input.props.className.includes("text-text-primary"), true)
  assert.equal(input.props.className.includes("placeholder:text-text-muted"), true)
  assert.equal(input.props.className.includes("pr-8"), true)
  assert.equal(closeButtonWrapper.type.name, "DialogClose")
  assert.equal(closeButtonWrapper.props.children.type, "button")
  assert.equal(closeButtonWrapper.props.children.props["aria-label"], "Close search")
})

test("CommandItem uses Orbit hover and selected states", () => {
  const element = CommandItem({ children: "Item" }) as any
  const className = flattenClassName(element)

  assert.ok(className.includes("data-[selected=true]:bg-surface-hover"))
  assert.ok(className.includes("data-[selected=true]:text-text-primary"))
})
