module type Icon = {let iconName: string;};

let treeToElement = tree => ReactDOMRe.createElement("div", [||]);

module Make = (Icon: Icon) => {
  let component = ReasonReact.statelessComponent(Icon.iconName);
  let make = (~className=?, ~color=?, ~size="1em", ~style=?, _children) => {
    ...component,
    render: _self => {
      /* TODO: Style */
      let actualStyle =
        switch (color) {
        | Some(color) => Some(ReactDOMRe.Style.make(~color, ()))
        | _ => None
        };

      <svg
        stroke="currentColor"
        fill="currentColor"
        strokeWidth="0"
        ?className
        style=?actualStyle
        height=size
        width=size>
        {treeToElement()}
      </svg>;
    },
  };
};