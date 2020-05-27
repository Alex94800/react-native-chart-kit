import React from "react";
import {
  View,
  ScrollView,
  Text,
  StyleSheet,
  Animated,
  TextInput,
  Dimensions, TouchableWithoutFeedback,
} from 'react-native';
import {
  Svg,
  Circle,
  Polygon,
  Polyline,
  Path,
  Rect,
  G, Defs,
} from 'react-native-svg';
import AbstractChart from "../abstract-chart";
import { LegendItem } from "./legend-item";
import {PanGestureHandler, NativeViewGestureHandler, TapGestureHandler} from 'react-native-gesture-handler';

let AnimatedCircle = Animated.createAnimatedComponent(Circle);

class LineChart extends AbstractChart {
  label = React.createRef();
  clearTimeout = null;
  tapGestureRef = React.createRef()
  state = {
    scrollableDotHorizontalOffset: new Animated.Value(0),
    dotsInfo: this.props.data.datasets[0].data.map((value, index) => ({ opacity: new Animated.Value(0) })),
  };

  getColor = (dataset, opacity) => {
    return (dataset.color || this.props.chartConfig.color)(opacity);
  };

  getStrokeWidth = dataset => {
    return dataset.strokeWidth || this.props.chartConfig.strokeWidth || 3;
  };

  getDatas = data =>
    data.reduce((acc, item) => (item.data ? [...acc, ...item.data] : acc), []);

  getPropsForDots = (x, i) => {
    const { getDotProps, chartConfig = {} } = this.props;
    if (typeof getDotProps === "function") {
      return getDotProps(x, i);
    }
    const { propsForDots = {} } = chartConfig;
    return { r: "4", ...propsForDots };
  };
  renderDots = config => {
    const {
      data,
      width,
      height,
      paddingTop,
      paddingRight,
      onDataPointClick
    } = config;
    const output = [];
    const datas = this.getDatas(data);
    const baseHeight = this.calcBaseHeight(datas, height);
    const {
      getDotColor,
      hidePointsAtIndex = [],
      renderDotContent = () => {
        return null;
      }
    } = this.props;

    data.forEach(dataset => {
      if (dataset.withDots == false) return;

      dataset.data.forEach((x, i) => {
        if (hidePointsAtIndex.includes(i)) {
          return;
        }
        const cx =
          paddingRight + (i * (width - paddingRight)) / (this.props.withFullwidthChart ? dataset.data.length - 1 : dataset.data.length);
        const cy =
          ((baseHeight - this.calcHeight(x, datas, height)) / 4) * 3 +
          paddingTop;
        const onPress = () => {
          if (!onDataPointClick || hidePointsAtIndex.includes(i)) {
            return;
          }

          onDataPointClick({
            index: i,
            value: x,
            dataset,
            x: cx,
            y: cy,
            getColor: opacity => this.getColor(dataset, opacity)
          });
        };

        let component = <></>
        if (i !== 0 && i < dataset.data.length - 1 && this.props.tooltips) {
          component =
          <Animated.View key={Math.random()}
                         style={{position: 'absolute', left: cx, top: cy - 50, opacity: this.state.dotsInfo[i - 1].opacity}}>
            {this.props.tooltips[i]}
          </Animated.View>
          if (!this.state.dotsInfo[i - 1].hasOwnProperty('x')) {
            const newDotsInfo = [ ...this.state.dotsInfo ]
            newDotsInfo[i - 1].x = cx
            this.setState(prevState => ({
              dotsInfo: newDotsInfo
            }))
          }
        }
        output.push(
          component,
          <Circle
            key={Math.random()}
            cx={cx}
            cy={cy}
            fill={
              typeof getDotColor === "function"
                ? getDotColor(x, i)
                : this.getColor(dataset, 0.9)
            }
            onPress={onPress}
            {...this.getPropsForDots(x, i)}
          />,
          <Circle
            key={Math.random()}
            cx={cx}
            cy={cy}
            r="14"
            fill="#fff"
            fillOpacity={0}
            onPress={onPress}
          />,
          renderDotContent({ x: cx, y: cy, index: i })
        );
      });
    });
    return output;
  };

  renderScrollableDot = config => {
    const {
      data,
      width,
      height,
      paddingTop,
      paddingRight,
      scrollableDotHorizontalOffset,
      scrollableDotFill,
      scrollableDotStrokeColor,
      scrollableDotStrokeWidth,
      scrollableDotRadius,
      scrollableInfoViewStyle,
      scrollableInfoTextStyle,
      scrollableInfoSize,
      scrollableInfoOffset
    } = config;
    const output = [];
    const datas = this.getDatas(data);
    const baseHeight = this.calcBaseHeight(datas, height);

    let vl = [];

    const perData = width / data[0].data.length;
    for (let index = 0; index < data[0].data.length; index++) {
      vl.push(index * perData);
    }
    let lastIndex;

    scrollableDotHorizontalOffset.addListener(value => {
      const index = value.value / perData;
      if (!lastIndex) {
        lastIndex = index;
      }

      let abs = Math.floor(index);
      let percent = index - abs;
      abs = data[0].data.length - abs - 1;

      if (index >= data[0].data.length - 1) {
        this.label.current.setNativeProps({
          text: `${Math.floor(data[0].data[0])}`
        });
      } else {
        if (index > lastIndex) {
          // to right

          const base = data[0].data[abs];
          const prev = data[0].data[abs - 1];
          if (prev > base) {
            let rest = prev - base;
            this.label.current.setNativeProps({
              text: `${Math.floor(base + percent * rest)}`
            });
          } else {
            let rest = base - prev;
            this.label.current.setNativeProps({
              text: `${Math.floor(base - percent * rest)}`
            });
          }
        } else {
          // to left

          const base = data[0].data[abs - 1];
          const next = data[0].data[abs];
          percent = 1 - percent;
          if (next > base) {
            let rest = next - base;
            this.label.current.setNativeProps({
              text: `${Math.floor(base + percent * rest)}`
            });
          } else {
            let rest = base - next;
            this.label.current.setNativeProps({
              text: `${Math.floor(base - percent * rest)}`
            });
          }
        }
      }
      lastIndex = index;
    });

    data.forEach(dataset => {
      if (dataset.withScrollableDot == false) return;

      const perData = width / dataset.data.length;
      let values = [];
      let yValues = [];
      let xValues = [];

      let yValuesLabel = [];
      let xValuesLabel = [];

      for (let index = 0; index < dataset.data.length; index++) {
        values.push(index * perData);
        const yval =
          ((baseHeight -
            this.calcHeight(
              dataset.data[dataset.data.length - index - 1],
              datas,
              height
            )) /
            4) *
            3 +
          paddingTop;
        yValues.push(yval);
        const xval =
          paddingRight +
          ((dataset.data.length - index - 1) * (width - paddingRight)) /
            dataset.data.length;
        xValues.push(xval);

        yValuesLabel.push(
          yval - (scrollableInfoSize.height + scrollableInfoOffset)
        );
        xValuesLabel.push(xval - scrollableInfoSize.width / 2);
      }

      const translateX = scrollableDotHorizontalOffset.interpolate({
        inputRange: values,
        outputRange: xValues,
        extrapolate: "clamp"
      });

      const translateY = scrollableDotHorizontalOffset.interpolate({
        inputRange: values,
        outputRange: yValues,
        extrapolate: "clamp"
      });

      const labelTranslateX = scrollableDotHorizontalOffset.interpolate({
        inputRange: values,
        outputRange: xValuesLabel,
        extrapolate: "clamp"
      });

      const labelTranslateY = scrollableDotHorizontalOffset.interpolate({
        inputRange: values,
        outputRange: yValuesLabel,
        extrapolate: "clamp"
      });

      output.push([
        <Animated.View
          key={Math.random()}
          style={[
            scrollableInfoViewStyle,
            {
              transform: [
                { translateX: labelTranslateX },
                { translateY: labelTranslateY }
              ],
              width: scrollableInfoSize.width,
              height: scrollableInfoSize.height
            }
          ]}
        >
          <TextInput
            onLayout={() => {
              this.label.current.setNativeProps({
                text: `${Math.floor(data[0].data[data[0].data.length - 1])}`
              });
            }}
            style={scrollableInfoTextStyle}
            ref={this.label}
          />
        </Animated.View>,
        <AnimatedCircle
          key={Math.random()}
          cx={translateX}
          cy={translateY}
          r={scrollableDotRadius}
          stroke={scrollableDotStrokeColor}
          strokeWidth={scrollableDotStrokeWidth}
          fill={scrollableDotFill}
        />
      ]);
    });

    return output;
  };

  renderShadow = config => {
    if (this.props.bezier) {
      return this.renderBezierShadow(config);
    }

    const { data, width, height, paddingRight, paddingTop } = config;
    const datas = this.getDatas(data);
    const baseHeight = this.calcBaseHeight(datas, height);
    return config.data.map((dataset, index) => {
      return (
        <Polygon
          key={index}
          points={
            dataset.data
              .map((d, i) => {
                const x =
                  paddingRight +
                  (i * (width - paddingRight)) / (this.props.withFullwidthChart ? dataset.data.length - 1 : dataset.data.length);
                const y =
                  ((baseHeight - this.calcHeight(d, datas, height)) / 4) * 3 +
                  paddingTop;
                return `${x},${y}`;
              })
              .join(" ") +
            ` ${paddingRight +
              ((width - paddingRight) / (this.props.withFullwidthChart ? dataset.data.length - 1 : dataset.data.length)) *
                (dataset.data.length - 1)},${(height / 4) * 3 +
              paddingTop} ${paddingRight},${(height / 4) * 3 + paddingTop}`
          }
          fill="url(#fillShadowGradient)"
          strokeWidth={0}
        />
      );
    });
  };

  renderLine = config => {
    if (this.props.bezier) {
      return this.renderBezierLine(config);
    }
    const {
      width,
      height,
      paddingRight,
      paddingTop,
      data,
      linejoinType
    } = config;
    const output = [];
    const datas = this.getDatas(data);
    const baseHeight = this.calcBaseHeight(datas, height);
    data.forEach((dataset, index) => {
      const points = dataset.data.map((d, i) => {
        const x =
          (i * (width - paddingRight)) / (this.props.withFullwidthChart ? dataset.data.length - 1 : dataset.data.length) + paddingRight;
        const y =
          ((baseHeight - this.calcHeight(d, datas, height)) / 4) * 3 +
          paddingTop;
        return `${x},${y}`;
      });
      output.push(
        <Polyline
          key={index}
          strokeLinejoin={linejoinType}
          points={points.join(" ")}
          fill="none"
          stroke={this.getColor(dataset, 0.2)}
          strokeWidth={this.getStrokeWidth(dataset)}
        />
      );
    });

    return output;
  };

  getBezierLinePoints = (dataset, config) => {
    const { width, height, paddingRight, paddingTop, data } = config;
    if (dataset.data.length === 0) {
      return "M0,0";
    }

    const datas = this.getDatas(data);
    const x = i =>
      Math.floor(
        paddingRight + (i * (width - paddingRight)) / (this.props.withFullwidthChart ? dataset.data.length - 1 : dataset.data.length)
      );
    const baseHeight = this.calcBaseHeight(datas, height);
    const y = i => {
      const yHeight = this.calcHeight(dataset.data[i], datas, height);
      return Math.floor(((baseHeight - yHeight) / 4) * 3 + paddingTop);
    };

    return [`M${x(0)},${y(0)}`]
      .concat(
        dataset.data.slice(0, -1).map((_, i) => {
          const x_mid = (x(i) + x(i + 1)) / 2;
          const y_mid = (y(i) + y(i + 1)) / 2;
          const cp_x1 = (x_mid + x(i)) / 2;
          const cp_x2 = (x_mid + x(i + 1)) / 2;
          return (
            `Q ${cp_x1}, ${y(i)}, ${x_mid}, ${y_mid}` +
            ` Q ${cp_x2}, ${y(i + 1)}, ${x(i + 1)}, ${y(i + 1)}`
          );
        })
      )
      .join(" ");
  };

  renderBezierLine = config => {
    return config.data.map((dataset, index) => {
      const result = this.getBezierLinePoints(dataset, config);
      return (
        <Path
          key={index}
          d={result}
          fill="none"
          stroke={this.getColor(dataset, 0.2)}
          strokeWidth={this.getStrokeWidth(dataset)}
        />
      );
    });
  };

  renderBezierShadow = config => {
    const { width, height, paddingRight, paddingTop, data } = config;
    return data.map((dataset, index) => {
      const d =
        this.getBezierLinePoints(dataset, config) +
        ` L${paddingRight +
          ((width - paddingRight) / (this.props.withFullwidthChart ? dataset.data.length - 1 : dataset.data.length)) *
            (dataset.data.length - 1)},${(height / 4) * 3 +
          paddingTop} L${paddingRight},${(height / 4) * 3 + paddingTop} Z`;
      return (
        <Path
          key={index}
          d={d}
          fill="url(#fillShadowGradient)"
          strokeWidth={0}
        />
      );
    });
  };

  onStateChange = (event) => {
    if (event.nativeEvent.state === 2) {
      this.displayClosest(event.nativeEvent.absoluteX)
    }
    if (event.nativeEvent.state === 5) {
      this.state.dotsInfo.forEach(dot => {
        Animated.timing(
          dot.opacity,
          {
            toValue: 0,
            duration: 300,
            useNativeDriver: false
          }
        ).start()
      })
    }
  }

  displayClosest = (x) => {
    const counts = []
    for (let i = 0; i < this.state.dotsInfo.length; i++) {
      if (this.state.dotsInfo[i].x) {
        counts.push(this.state.dotsInfo[i].x)
      }
    }
    const goal = x

    const closest = counts.reduce(function(prev, curr) {
      return (Math.abs(curr - goal) < Math.abs(prev - goal) ? curr : prev);
    });

    Animated.timing(
      this.state.dotsInfo.find(i => i.x === closest).opacity,
      {
        toValue: 1,
        duration: 150,
        useNativeDriver: false
      }
    ).start()
  }

  onGestureEvent = (event) => {
    if ((Math.abs(event.nativeEvent.translationY) > 20 && Math.abs(event.nativeEvent.translationX) < 20) || Math.abs(event.nativeEvent.translationY) > 160) {
      this.state.dotsInfo.forEach(item => {
        Animated.timing(
          item.opacity,
          {
            toValue: 0,
            duration: 50,
            useNativeDriver: false
          }
        ).start()
      })
      return
    }
    const counts = []
    for (let i = 0; i < this.state.dotsInfo.length; i++) {
      if (this.state.dotsInfo[i].x) {
        counts.push(this.state.dotsInfo[i].x)
      }
    }
    const goal = event.nativeEvent.absoluteX

    const closest = counts.reduce(function(prev, curr) {
      return (Math.abs(curr - goal) < Math.abs(prev - goal) ? curr : prev);
    });

    if (Math.abs(event.nativeEvent.translationY) < 20) {
      Animated.timing(
        this.state.dotsInfo.find(i => i.x === closest).opacity,
        {
          toValue: 1,
          duration: 50,
          useNativeDriver: false
        }
      ).start()
      this.state.dotsInfo.filter(i => i.x !== closest).forEach(item => {
        Animated.timing(
          item.opacity,
          {
            toValue: 0,
            duration: 50,
            useNativeDriver: false
          }
        ).start()
      })
    }
  }

  renderLegend = (width, legendOffset) => {
    const { legend, datasets } = this.props.data;
    const baseLegendItemX = width / (legend.length + 1);

    return legend.map((legendItem, i) => (
      <G key={Math.random()}>
        <LegendItem
          index={i}
          iconColor={this.getColor(datasets[i], 0.9)}
          baseLegendItemX={baseLegendItemX}
          legendText={legendItem}
          labelProps={{ ...this.getPropsForLabels() }}
          legendOffset={legendOffset}
        />
      </G>
    ));
  };

  render() {
    const {
      width,
      height,
      data,
      withScrollableDot = false,
      withShadow = true,
      withDots = true,
      withInnerLines = true,
      withOuterLines = true,
      withHorizontalLabels = true,
      withVerticalLabels = true,
      withFullwidthChart = false,

      style = {},
      decorator,
      onDataPointClick,
      verticalLabelRotation = 0,
      horizontalLabelRotation = 0,
      horizontalLabelWidth = 64,
      formatYLabel = yLabel => yLabel,
      formatXLabel = xLabel => xLabel,
      segments,
      transparent = false
    } = this.props;
    const { scrollableDotHorizontalOffset } = this.state;
    const { labels = [] } = data;
    const {
      borderRadius = 0,
      paddingTop = 2,
      paddingRight = withFullwidthChart ? 0 : 64,
      margin = 0,
      marginRight = 0,
      paddingBottom = 0
    } = style;

    const config = {
      width,
      height,
      verticalLabelRotation,
      horizontalLabelRotation
    };

    const datas = this.getDatas(data.datasets);

    let count = Math.min(...datas) === Math.max(...datas) ? 1 : 4;
    if (segments) {
      count = segments;
    }

    const legendOffset = this.props.data.legend ? height * 0.15 : 0;
    return (
      <>
        <TapGestureHandler enabled={!!this.props.tooltips}
                           onHandlerStateChange={this.onStateChange}>
          <PanGestureHandler enabled={!!this.props.tooltips}
                             ref={this.panGestureRef}
                             simultaneousHandlers={this.props.nativeHandler}
                             onGestureEvent={this.onGestureEvent}
                             onHandlerStateChange={this.onStateChange}>
            <View style={style}>
              <Svg
                height={height + paddingBottom + legendOffset}
                width={width - margin * 2 - marginRight}
              >
                <Rect
                  width="100%"
                  height={height + legendOffset}
                  rx={borderRadius}
                  ry={borderRadius}
                  fill="url(#backgroundGradient)"
                  fillOpacity={transparent ? 0 : 1}
                />
                {this.props.data.legend &&
                this.renderLegend(config.width, legendOffset)}
                <G x="0" y={legendOffset}>
                  {this.renderDefs({
                    ...config,
                    ...this.props.chartConfig
                  })}
                  <G>
                    {withInnerLines
                      ? this.renderHorizontalLines({
                        ...config,
                        count: count,
                        paddingTop,
                        paddingRight
                      })
                      : withOuterLines
                        ? this.renderHorizontalLine({
                          ...config,
                          paddingTop,
                          paddingRight
                        })
                        : null}
                  </G>
                  <G>
                    {withHorizontalLabels
                      ? this.renderHorizontalLabels({
                        ...config,
                        count: count,
                        data: datas,
                        paddingTop,
                        paddingRight,
                        formatYLabel,
                        decimalPlaces: this.props.chartConfig.decimalPlaces
                      })
                      : null}
                  </G>
                  <G>
                    {withInnerLines
                      ? this.renderVerticalLines({
                        ...config,
                        data: data.datasets[0].data,
                        paddingTop,
                        paddingRight
                      })
                      : withOuterLines
                        ? this.renderVerticalLine({
                          ...config,
                          paddingTop,
                          paddingRight
                        })
                        : null}
                  </G>
                  <G>
                    {withVerticalLabels
                      ? this.renderVerticalLabels({
                        ...config,
                        labels,
                        paddingRight,
                        paddingTop,
                        formatXLabel
                      })
                      : null}
                  </G>
                  <G>
                    {this.renderLine({
                      ...config,
                      ...this.props.chartConfig,
                      paddingRight,
                      paddingTop,
                      data: data.datasets
                    })}
                  </G>
                  <G>
                    {withShadow &&
                    this.renderShadow({
                      ...config,
                      data: data.datasets,
                      paddingRight,
                      paddingTop
                    })}
                  </G>
                  <G>
                    {withDots &&
                    this.renderDots({
                      ...config,
                      data: data.datasets,
                      paddingTop,
                      paddingRight,
                      onDataPointClick
                    })}
                  </G>
                  <G>
                    {withScrollableDot &&
                    this.renderScrollableDot({
                      ...config,
                      ...this.props.chartConfig,
                      data: data.datasets,
                      paddingTop,
                      paddingRight,
                      onDataPointClick,
                      scrollableDotHorizontalOffset
                    })}
                  </G>
                  <G>
                    {decorator &&
                    decorator({
                      ...config,
                      data: data.datasets,
                      paddingTop,
                      paddingRight
                    })}
                  </G>
                </G>
              </Svg>
              {withScrollableDot && (
                <ScrollView
                  style={StyleSheet.absoluteFill}
                  contentContainerStyle={{ width: width * 2 }}
                  showsHorizontalScrollIndicator={false}
                  scrollEventThrottle={16}
                  onScroll={Animated.event([
                    {
                      nativeEvent: {
                        contentOffset: { x: scrollableDotHorizontalOffset }
                      }
                    }
                  ])}
                  horizontal
                  bounces={false}
                />
              )}
            </View>
          </PanGestureHandler>
        </TapGestureHandler>
      </>
    );
  }
}

export default LineChart;
