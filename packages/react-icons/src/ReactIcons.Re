module type Icon = {
  let iconName: string;
};

let treeToElement = tree => ReactDOMRe.createElement("circle", [||]);

module Make = (Icon: Icon) => {
  let component = ReasonReact.statelessComponent(Icon.iconName);
  let make = (~className=?, ~color=?, ~size="1em", ~style=?, _children) => {
    ...component,
    render: _self => {

      let actualStyle =
        switch ((color, style)) {
        | (Some(color), None) => Some(ReactDOMRe.Style.make(~color, ()))
        | (None, Some(style)) => style
        | (Some(color, Some(style)) => ReactDOMRe.Style.combine(ReactDOMRe.Style.make(~color, ()), style)
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