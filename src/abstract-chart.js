import React, { Component } from "react";

import { LinearGradient, Line, Text, Defs, Stop } from "react-native-svg";

class AbstractChart extends Component {
  calcScaler = data => {
    if (this.props.fromZero) {
      return Math.max(...data, 0) - Math.min(...data, 0) || 1;
    } else if (this.props.fromValue) {
      return Math.max(...data, this.props.fromValue) - Math.min(...data, this.props.fromValue) || 1;
    } else {
      return Math.max(...data) - Math.min(...data) || 1;
    }
  };

  calcBaseHeight = (data, height) => {
    const min = Math.min(...data);
    const max = Math.max(...data);
    if (min >= 0 && max >= 0) {
      return height;
    } else if (min < 0 && max <= 0) {
      return 0;
    } else if (min < 0 && max > 0) {
      return (height * max) / this.calcScaler(data);
    }
  };

  calcHeight = (val, data, height) => {
    const max = Math.max(...data);
    const min = Math.min(...data);
    if (min < 0 && max > 0) {
      return height * (val / this.calcScaler(data));
    } else if (min >= 0 && max >= 0) {
      if (this.props.fromValue) {
        return height * ((val - this.props.fromValue) / this.calcScaler(data));
      }
      return this.props.fromZero
        ? height * (val / this.calcScaler(data))
        : height * ((val - min) / this.calcScaler(data));
    } else if (min < 0 && max <= 0) {
      return this.props.fromZero
        ? height * (val / this.calcScaler(data))
        : height * ((val - max) / this.calcScaler(data));
    }
  };

  getPropsForBackgroundLines() {
    const { propsForBackgroundLines = {} } = this.props.chartConfig;
    return {
      stroke: this.props.lineConfig.color,
      strokeDasharray: "5, 5",
      strokeWidth: 0.5,
      ...propsForBackgroundLines
    };
  }

  getPropsForLabels() {
    const {
      propsForLabels = {},
      color,
      labelColor = color
    } = this.props.chartConfig;

    const finalColor = this.props.lineConfig && this.props.lineConfig.labelStyle ?
      this.props.lineConfig.labelStyle.color || labelColor(0.8) : labelColor(0.8)

    const fontSize = this.props.lineConfig && this.props.lineConfig.labelStyle ?
      this.props.lineConfig.labelStyle.fontSize || 12 : 12
    const style = this.props.lineConfig && this.props.lineConfig.labelStyle ?
      this.props.lineConfig.labelStyle : {}
    return {
      fontSize: fontSize,
      fill: finalColor,
      ...propsForLabels,
      ...style
    };
  }

  renderHorizontalLines = config => {
    const { count, width, height, paddingTop, paddingRight } = config;
    const basePosition = height - height / 4;
    const leftOffset = this.props.chartConfig.leftOffset || 0
    return [...new Array(count + 1)].map((_, i) => {
      const y = (basePosition / count) * i + paddingTop;
      return (
        <Line
          key={Math.random()}
          x1={leftOffset}
          y1={y}
          x2={width}
          y2={y}
          {...this.getPropsForBackgroundLines()}
        />
      );
    });
  };

  renderHorizontalLine = config => {
    const { width, height, paddingTop, paddingRight } = config;
    return (
      <Line
        key={Math.random()}
        x1={paddingRight}
        y1={height - height / 4 + paddingTop}
        x2={width}
        y2={height - height / 4 + paddingTop}
        {...this.getPropsForBackgroundLines()}
      />
    );
  };

  renderHorizontalLabels = config => {
    const {
      count,
      data,
      height,
      paddingTop,
      paddingRight,
      horizontalLabelRotation = 0,
      decimalPlaces = 2,
      formatYLabel = yLabel => yLabel
    } = config;
    const leftOffset = this.props.chartConfig.leftOffset || 0
    const {
      yAxisLabel = "",
      yAxisSuffix = "",
      yLabelsOffset = 12
    } = this.props;

    return [...Array(count === 1 ? 1 : count + 1).keys()].map((i, _) => {
      let yLabel = i * count;

      if (count === 1) {
        yLabel = `${yAxisLabel}${formatYLabel(
          data[0].toFixed(decimalPlaces)
        )}${yAxisSuffix}`;
      } else {
        let label = this.props.fromZero
          ? (this.calcScaler(data) / count) * i + Math.min(...data, 0)
          : (this.calcScaler(data) / count) * i + Math.min(...data);
        if (this.props.fromValue) {
          label = (this.calcScaler(data) / count) * i + Math.min(...data, this.props.fromValue)
        }
        if (label < 1000) {
          yLabel = `${yAxisLabel}${formatYLabel(
            label.toLocaleString(this.props.locale || 'en', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
          )}${yAxisSuffix}`;
        } else if (label < 1000000) {
          label = label/1000
          yLabel = `${yAxisLabel}${formatYLabel(
            label.toLocaleString(this.props.locale || 'en', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
          )}k${yAxisSuffix}`
        } else {
          label = label/1000000
          yLabel = `${yAxisLabel}${formatYLabel(
            label.toLocaleString(this.props.locale || 'en', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
          )}M${yAxisSuffix}`
        }

      }
      const basePosition = height - height / 4;
      const x = paddingRight - yLabelsOffset;
      const y =
        count === 1 && this.props.fromZero
          ? paddingTop + 4
          : (height * 3) / 4 - (basePosition / count) * i + paddingTop;
      return (
        <Text
          rotation={horizontalLabelRotation}
          origin={`${x}, ${y}`}
          key={Math.random()}
          x={x + leftOffset}
          textAnchor="end"
          y={y + 4}
          {...this.getPropsForLabels()}
        >
          {yLabel}
        </Text>
      );
    });
  };

  renderVerticalLabels = config => {
    const {
      labels = [],
      width,
      height,
      paddingRight,
      paddingTop,
      horizontalOffset = 0,
      stackedBar = false,
      verticalLabelRotation = 0,
      formatXLabel = xLabel => xLabel
    } = config;
    const {
      xAxisLabel = "",
      xLabelsOffset = 0,
      hidePointsAtIndex = []
    } = this.props;
    const fontSize = 12;
    let fac = 1;
    if (stackedBar) {
      fac = 0.71;
    }
    return labels.map((label, i) => {
      if (hidePointsAtIndex.includes(i)) {
        return null;
      }
      const x =
        (((width - paddingRight) / labels.length) * i +
          paddingRight +
          horizontalOffset) *
        fac;
      const y = (height * 3) / 4 + paddingTop + fontSize * 2 + xLabelsOffset;
      return (
        <Text
          origin={`${x}, ${y}`}
          rotation={verticalLabelRotation}
          key={Math.random()}
          x={x}
          y={y}
          textAnchor={verticalLabelRotation === 0 ? "middle" : "start"}
          {...this.getPropsForLabels()}
        >
          {`${formatXLabel(label)}${xAxisLabel}`}
        </Text>
      );
    });
  };

  renderVerticalLines = config => {
    const { data, width, height, paddingTop, paddingRight } = config;
    const { yAxisInterval = 1 } = this.props;
    return [...new Array(Math.ceil(data.length / yAxisInterval))].map(
      (_, i) => {
        return (
          <></>
        );
      }
    );
  };

  renderVerticalLine = config => {
    const { height, paddingTop, paddingRight } = config;
    return (
      <></>
    );
  };

  renderDefs = config => {
    const {
      width,
      height,
      backgroundGradientFrom,
      backgroundGradientTo
    } = config;
    const fromOpacity = config.hasOwnProperty("backgroundGradientFromOpacity")
      ? config.backgroundGradientFromOpacity
      : 1.0;
    const toOpacity = config.hasOwnProperty("backgroundGradientToOpacity")
      ? config.backgroundGradientToOpacity
      : 1.0;

    const fillShadowGradient = config.hasOwnProperty("fillShadowGradient")
      ? config.fillShadowGradient
      : this.props.chartConfig.color();

    const fillShadowGradientOpacity = config.hasOwnProperty(
      "fillShadowGradientOpacity"
    )
      ? config.fillShadowGradientOpacity
      : 0.1;

    return (
      <Defs>
        <LinearGradient
          id="backgroundGradient"
          x1="0"
          y1={height}
          x2={width}
          y2={0}
        >
          <Stop
            offset="0"
            stopColor={backgroundGradientFrom}
            stopOpacity={fromOpacity}
          />
          <Stop
            offset="1"
            stopColor={backgroundGradientTo}
            stopOpacity={toOpacity}
          />
        </LinearGradient>
        <LinearGradient
          id="fillShadowGradient"
          x1={0}
          y1={0}
          x2={0}
          y2={1}
        >
          <Stop
            offset="0"
            stopColor={fillShadowGradient}
            stopOpacity={fillShadowGradientOpacity}
          />
          <Stop offset="1" stopColor={fillShadowGradient} stopOpacity="0" />
        </LinearGradient>
      </Defs>
    );
  };
}

export default AbstractChart;
