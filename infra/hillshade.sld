<?xml version="1.0" encoding="UTF-8"?>
<StyledLayerDescriptor version="1.0.0" xmlns="http://www.opengis.net/sld" xmlns:ogc="http://www.opengis.net/ogc">
  <NamedLayer><Name>sol_hillshade</Name><UserStyle><Title>Hillshade (flat ground transparent)</Title>
    <FeatureTypeStyle><Rule><RasterSymbolizer><Opacity>1.0</Opacity>
      <ColorMap type="ramp">
        <ColorMapEntry color="#000000" quantity="0"   opacity="0.60"/>
        <ColorMapEntry color="#000000" quantity="120" opacity="0.40"/>
        <ColorMapEntry color="#000000" quantity="165" opacity="0.14"/>
        <ColorMapEntry color="#000000" quantity="178" opacity="0.0"/>
        <ColorMapEntry color="#ffffff" quantity="184" opacity="0.0"/>
        <ColorMapEntry color="#ffffff" quantity="205" opacity="0.18"/>
        <ColorMapEntry color="#ffffff" quantity="255" opacity="0.40"/>
      </ColorMap>
    </RasterSymbolizer></Rule></FeatureTypeStyle>
  </UserStyle></NamedLayer>
</StyledLayerDescriptor>
