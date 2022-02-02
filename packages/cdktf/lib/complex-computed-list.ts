import { IResolvable, Token } from "./tokens";
import {
  IInterpolatingParent,
  ITerraformAddressable,
} from "./terraform-addressable";
import { propertyAccess, Fn } from ".";

abstract class ComplexComputedAttribute implements IInterpolatingParent {
  constructor(
    protected terraformResource: IInterpolatingParent,
    protected terraformAttribute: string
  ) {}

  public getStringAttribute(terraformAttribute: string) {
    return Token.asString(this.interpolationForAttribute(terraformAttribute));
  }

  public getNumberAttribute(terraformAttribute: string) {
    return Token.asNumber(this.interpolationForAttribute(terraformAttribute));
  }

  public getListAttribute(terraformAttribute: string) {
    return Token.asList(this.interpolationForAttribute(terraformAttribute));
  }

  public getBooleanAttribute(terraformAttribute: string): IResolvable {
    return this.interpolationForAttribute(terraformAttribute);
  }

  public getNumberListAttribute(terraformAttribute: string) {
    return Token.asNumberList(
      this.interpolationForAttribute(terraformAttribute)
    );
  }

  public getStringMapAttribute(terraformAttribute: string) {
    return Token.asStringMap(
      this.interpolationForAttribute(terraformAttribute)
    );
  }

  public getNumberMapAttribute(terraformAttribute: string) {
    return Token.asNumberMap(
      this.interpolationForAttribute(terraformAttribute)
    );
  }

  public getBooleanMapAttribute(terraformAttribute: string) {
    return Token.asBooleanMap(
      this.interpolationForAttribute(terraformAttribute)
    );
  }

  public getAnyMapAttribute(terraformAttribute: string) {
    return Token.asAnyMap(this.interpolationForAttribute(terraformAttribute));
  }

  public abstract interpolationForAttribute(terraformAttribute: string): any;
}

export class StringMap {
  constructor(
    protected terraformResource: IInterpolatingParent,
    protected terraformAttribute: string
  ) {}

  public lookup(key: string): string {
    return Token.asString(
      this.terraformResource.interpolationForAttribute(
        `${this.terraformAttribute}["${key}"]`
      )
    );
  }
}

export class NumberMap {
  constructor(
    protected terraformResource: IInterpolatingParent,
    protected terraformAttribute: string
  ) {}

  public lookup(key: string): number {
    return Token.asNumber(
      this.terraformResource.interpolationForAttribute(
        `${this.terraformAttribute}["${key}"]`
      )
    );
  }
}

export class BooleanMap {
  constructor(
    protected terraformResource: IInterpolatingParent,
    protected terraformAttribute: string
  ) {}

  public lookup(key: string): IResolvable {
    return this.terraformResource.interpolationForAttribute(
      `${this.terraformAttribute}["${key}"]`
    );
  }
}

export class AnyMap {
  constructor(
    protected terraformResource: IInterpolatingParent,
    protected terraformAttribute: string
  ) {}

  public lookup(key: string): any {
    return Token.asAny(
      this.terraformResource.interpolationForAttribute(
        `${this.terraformAttribute}["${key}"]`
      )
    );
  }
}

/**
 * @deprecated Going to be replaced by Array of ComplexListItem
 * and will be removed in the future FIXME: update this comment
 */
export class ComplexComputedList extends ComplexComputedAttribute {
  constructor(
    protected terraformResource: IInterpolatingParent,
    protected terraformAttribute: string,
    protected complexComputedListIndex: string,
    protected wrapsSet?: boolean
  ) {
    super(terraformResource, terraformAttribute);
  }

  public interpolationForAttribute(property: string) {
    if (this.wrapsSet) {
      return propertyAccess(
        Fn.tolist(
          this.terraformResource.interpolationForAttribute(
            this.terraformAttribute
          )
        ),
        [this.complexComputedListIndex, property]
      );
    }

    return this.terraformResource.interpolationForAttribute(
      `${this.terraformAttribute}.${this.complexComputedListIndex}.${property}`
    );
  }
}

// FIXME: this class is currently readonly, could we ever make this writable? (as in adjustable when used as input?)
export abstract class ComplexList implements ITerraformAddressable {
  constructor(
    protected terraformResource: IInterpolatingParent,
    protected terraformAttribute: string,
    protected wrapsSet: boolean
  ) {}

  public abstract get(index: string): ComplexListItem;

  /**
   * to be used by concrete classes extending ComplexList to implement the abstract method `get`
   */
  protected instantiateItemForIndex(
    index: string,
    Constructor: new (
      ...args: ConstructorParameters<typeof ComplexListItem>
    ) => ComplexListItem
  ): ComplexListItem {
    return new Constructor(
      this.terraformResource,
      this.terraformAttribute,
      index,
      this.wrapsSet
    );

    /*
    protected terraformResource: IInterpolatingParent,
    protected terraformAttribute: string,
    protected complexListItemIndex: string,
    protected wrapsSet?: boolean
    */
  }

  get fqn(): string {
    return Token.asString(
      this.terraformResource.interpolationForAttribute(this.terraformAttribute)
    );
  }
}

export class ComplexObject extends ComplexComputedAttribute {
  constructor(
    protected terraformResource: IInterpolatingParent,
    protected terraformAttribute: string
  ) {
    super(terraformResource, terraformAttribute);
  }

  public interpolationForAttribute(property: string) {
    return this.terraformResource.interpolationForAttribute(
      `${this.terraformAttribute}[0].${property}`
    );
  }

  protected interpolationAsList() {
    return this.terraformResource.interpolationForAttribute(
      `${this.terraformAttribute}`
    );
  }
}

const COMPLEX_LIST_ITEM_SYMBOL = Symbol.for("cdktf/ComplexListItem");
export class ComplexListItem
  extends ComplexComputedAttribute
  implements ITerraformAddressable
{
  constructor(
    protected terraformResource: IInterpolatingParent,
    protected terraformAttribute: string,
    protected complexListItemIndex: string,
    protected wrapsSet: boolean
  ) {
    super(terraformResource, terraformAttribute);
    Object.defineProperty(this, COMPLEX_LIST_ITEM_SYMBOL, { value: true });
  }

  public static isComplexListItem(x: any): x is ComplexListItem {
    // FIXME: adjust parts where this is used, disables them by returning false for now.
    return false;
    // return x !== null && typeof x === "object" && COMPLEX_LIST_ITEM_SYMBOL in x;
    // FIXME: what do we need to do to properly resolve whenever a complex list item is passed somewhere?
  }

  public interpolationForAttribute(property: string) {
    // if (typeof this.complexListItemIndex !== "string") {
    //   throw new Error(`Cannot directly access property ${property} in list which is only known at runtime.
    //   Use Fn.lookup(Fn.element(yourList, yourIndex), "${property}", defaultValue) instead`);
    // }

    if (this.wrapsSet) {
      return propertyAccess(
        Fn.tolist(
          this.terraformResource.interpolationForAttribute(
            this.terraformAttribute
          )
        ),
        [this.complexListItemIndex, property]
      );
    }

    return this.terraformResource.interpolationForAttribute(
      `${this.terraformAttribute}.${this.complexListItemIndex}.${property}`
    );
  }

  public get fqn() {
    if (this.wrapsSet) {
      return Token.asString(
        propertyAccess(
          Fn.tolist(
            this.terraformResource.interpolationForAttribute(
              this.terraformAttribute
            )
          ),
          [this.complexListItemIndex]
        )
      );
    }

    return Token.asString(
      this.terraformResource.interpolationForAttribute(
        `${this.terraformAttribute}.${this.complexListItemIndex}`
      )
    );
  }
}
