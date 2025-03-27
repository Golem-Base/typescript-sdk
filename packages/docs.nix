{
  pkgs,
  ...
}:
pkgs.stdenvNoCC.mkDerivation {
  name = "docs";

  src = ../docs;

  nativeBuildInputs = (
    with pkgs.python3Packages;
    [
      mike
      mkdocs
      mkdocs-material
      mkdocs-awesome-pages-plugin
    ]
  );

  buildPhase = ''
    mkdocs build
  '';

  installPhase = ''
    mv out $out
  '';
}
